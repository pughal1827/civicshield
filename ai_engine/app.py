"""
CivicShield AI — Image Verification Microservice
FastAPI server exposing POST /api/v1/verify-incident-image
"""

from __future__ import annotations

import os
import time
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .pipeline import run_verification_pipeline

# ── Logging ────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("civicshield_ai")

# ── Startup / Shutdown ─────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Pre-load models on startup."""
    logger.info("[STARTUP] Pre-loading AI models...")
    try:
        from .models.yolo_detector import load_model
        from .models.clip_matcher import load_clip_model
        from .models.rf_severity_classifier import get_classifier
        from .models.isolation_forest_anomaly import get_anomaly_detector

        load_model("yolov8n.pt")
        load_clip_model("openai/clip-vit-base-patch32")
        get_classifier().train()
        get_anomaly_detector().train()

        logger.info("[STARTUP] All models loaded successfully.")
    except Exception as e:
        logger.warning(f"[STARTUP] Model pre-load warning: {e}")

    yield

    logger.info("[SHUTDOWN] Cleaning up...")


# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="CivicShield AI — Incident Image Verification",
    description="Multi-modal AI pipeline for verifying civic incident image submissions.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health ─────────────────────────────────────────────────────────────────────
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "civicshield-ai",
        "version": "1.0.0",
    }


# ── Main Verification Endpoint ─────────────────────────────────────────────────
@app.post("/api/v1/verify-incident-image")
async def verify_incident_image(
    image: UploadFile = File(..., description="Citizen-uploaded image (JPEG, PNG, WebP)"),
    description: str = Form(..., description="Citizen's text description of the issue"),
    claimed_category: str = Form(default="", description="Category selected by citizen (optional)"),
    latitude: float | None = Form(default=None, description="GPS latitude (optional)"),
    longitude: float | None = Form(default=None, description="GPS longitude (optional)"),
):
    """
    Run the full 4-tier AI verification pipeline on a civic incident submission.

    Pipeline stages:
        1. YOLOv8 object & hazard detection
        2. CLIP cross-modal semantic alignment
        3. Random Forest category + severity classification
        4. Isolation Forest anomaly / fraud detection

    Returns structured JSON with all tier outputs and a final decision action.
    """
    t_start = time.time()

    # ── Input validation ──────────────────────────────────────────────────────
    ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
    if image.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported image format: {image.content_type}. "
                   f"Allowed: {ALLOWED_CONTENT_TYPES}",
        )

    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    image_bytes = await image.read()

    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty image file.")

    if len(image_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Image file too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB",
        )

    if not description or not description.strip():
        raise HTTPException(status_code=400, detail="Description text is required.")

    description = description.strip()

    # ── Run pipeline ──────────────────────────────────────────────────────────
    try:
        result = run_verification_pipeline(
            image_bytes=image_bytes,
            text_description=description,
            claimed_category=claimed_category.strip(),
        )
    except Exception as e:
        logger.error(f"Pipeline execution error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="AI pipeline processing failed. Please try again.",
        )

    # ── Build response ────────────────────────────────────────────────────────
    response = result.to_dict()
    response["processing_time_ms"] = result.processing_time_ms
    response["models_used"] = result.models_used

    total_ms = int((time.time() - t_start) * 1000)
    logger.info(
        f"Verification complete: decision={result.decision_action} "
        f"category={result.predicted_category} severity={result.predicted_severity} "
        f"match={result.match_status} anomaly={result.is_anomaly} "
        f"time={total_ms}ms"
    )

    return JSONResponse(content=response)


# ── Batch endpoint (stretch) ───────────────────────────────────────────────────
@app.post("/api/v1/verify-batch")
async def verify_batch(
    images: list[UploadFile] = File(...),
    description: str = Form(...),
    claimed_category: str = Form(default=""),
):
    """
    Verify multiple images against a single description.
    Useful when a citizen submits multiple photos of the same incident.
    """
    if len(images) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 images per batch.")

    results = []
    for img in images:
        img_bytes = await img.read()
        if len(img_bytes) == 0:
            continue

        result = run_verification_pipeline(
            image_bytes=img_bytes,
            text_description=description,
            claimed_category=claimed_category.strip(),
        )
        results.append({
            "filename": img.filename,
            "result": result.to_dict(),
        })

    return {
        "batch_size": len(results),
        "results": results,
    }


# ── Error handler ──────────────────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc)},
    )
