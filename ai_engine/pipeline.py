"""
AI Pipeline Orchestrator
Combines all 4 models into a single end-to-end inference pass.
"""

from __future__ import annotations

import time
import numpy as np
from typing import Optional, BinaryIO
from io import BytesIO
from PIL import Image

from .models.yolo_detector import detect as yolo_detect, get_civic_hazard_labels, YOLODetectionResult
from .models.clip_matcher import verify_image_text_match, CLIPMatchResult
from .models.rf_severity_classifier import build_feature_vector, extract_image_features, extract_text_features, get_classifier
from .models.isolation_forest_anomaly import (
    extract_anomaly_features,
    get_anomaly_detector,
)


# ── Pipeline result ────────────────────────────────────────────────────────────
class VerificationResult:
    """Unified result from the 4-tier AI pipeline."""

    def __init__(self) -> None:
        # Verification
        self.is_match: bool | None = None
        self.match_status: str = "REVIEW"
        self.similarity_score: float = 0.0
        self.confidence_score: float = 0.0

        # YOLO
        self.yolo_detections: list[dict] = []
        self.yolo_detection_count: int = 0
        self.yolo_top_confidence: float = 0.0
        self.yolo_labels: list[str] = []
        self.yolo_model_loaded: bool = False

        # ML Predictions
        self.predicted_category: str = "PUBLIC_INFRA_DAMAGE"
        self.predicted_severity: str = "MEDIUM"
        self.category_confidence: float = 0.0
        self.severity_confidence: float = 0.0
        self.category_confirmed: bool = False

        # Anomaly
        self.is_anomaly: bool = False
        self.anomaly_score: float = 0.0
        self.is_fraud_or_spam: bool = False
        self.anomaly_flags: list[str] = []

        # Final decision
        self.decision_action: str = "REVIEW"
        self.processing_time_ms: int = 0
        self.models_used: list[str] = []

    def to_dict(self) -> dict:
        return {
            "verification": {
                "is_match": self.is_match,
                "match_status": self.match_status,
                "similarity_score": round(self.similarity_score, 4),
                "confidence_score": round(self.confidence_score, 4),
                "is_anomaly": self.is_anomaly,
                "anomaly_score": round(self.anomaly_score, 4),
            },
            "yolo_detections": self.yolo_detections,
            "ml_predictions": {
                "predicted_category": self.predicted_category,
                "predicted_severity": self.predicted_severity,
                "category_confirmed": self.category_confirmed,
                "category_confidence": round(self.category_confidence, 4),
            },
            "anomaly_detection": {
                "is_fraud_or_spam": self.is_fraud_or_spam,
                "flags": self.anomaly_flags,
            },
            "decision_action": self.decision_action,
            "processing_time_ms": self.processing_time_ms,
            "models_used": self.models_used,
        }


# ── Main pipeline ──────────────────────────────────────────────────────────────
def run_verification_pipeline(
    image_bytes: bytes,
    text_description: str,
    claimed_category: str = "",
) -> VerificationResult:
    """
    Run the complete 4-tier AI verification pipeline on a civic report.

    Parameters
    ----------
    image_bytes : bytes
        Raw image bytes (JPEG, PNG, WebP).
    text_description : str
        Citizen's text description of the issue.
    claimed_category : str
        Category selected by the citizen (optional).

    Returns
    -------
    VerificationResult
        Structured result from all 4 models.
    """
    result = VerificationResult()
    t_start = time.time()
    steps_log: list[str] = []

    try:
        # ── Load image ────────────────────────────────────────────────────────
        img = Image.open(BytesIO(image_bytes)).convert("RGB")

        # ── TIER 1: YOLO Object Detection ────────────────────────────────────
        try:
            yolo_raw = yolo_detect(image_bytes)
            result.yolo_detections = yolo_raw.detections
            result.yolo_detection_count = yolo_raw.detection_count
            result.yolo_top_confidence = yolo_raw.top_confidence
            result.yolo_labels = yolo_raw.labels
            result.yolo_model_loaded = yolo_raw.model_loaded
            result.models_used.append("yolov8")
            steps_log.append(f"YOLO: {yolo_raw.detection_count} detections")
        except Exception as e:
            steps_log.append(f"YOLO error: {e}")
            print(f"[PIPELINE] YOLO failed: {e}")

        # ── TIER 2: CLIP Cross-Modal Verification ────────────────────────────
        clip_result: CLIPMatchResult | None = None
        try:
            clip_result = verify_image_text_match(image_bytes, text_description)
            result.is_match = clip_result.is_match
            result.match_status = clip_result.match_status
            result.similarity_score = clip_result.similarity_score
            result.confidence_score = clip_result.confidence_score
            result.models_used.append("clip")
            steps_log.append(f"CLIP: {clip_result.match_status} (sim={clip_result.similarity_score:.3f})")
        except Exception as e:
            steps_log.append(f"CLIP error: {e}")
            print(f"[PIPELINE] CLIP failed: {e}")

        # ── Build multi-modal feature vector ─────────────────────────────────
        img_features = extract_image_features(img)
        txt_features = extract_text_features(text_description)

        feature_vector = build_feature_vector(
            clip_similarity=result.similarity_score,
            yolo_top_confidence=result.yolo_top_confidence,
            yolo_detection_count=result.yolo_detection_count,
            yolo_labels=result.yolo_labels,
            text=text_description,
            image_features=img_features,
        )

        # ── TIER 3: Random Forest Classification ─────────────────────────────
        try:
            classifier = get_classifier()
            ml_result = classifier.predict(feature_vector)
            result.predicted_category = ml_result["predicted_category"]
            result.predicted_severity = ml_result["predicted_severity"]
            result.category_confidence = ml_result["category_confidence"]
            result.severity_confidence = ml_result["severity_confidence"]

            # Category is "confirmed" if RF agrees with claimed category or CLIP matched
            if claimed_category:
                result.category_confirmed = (
                    result.predicted_category == claimed_category.upper()
                    or result.is_match is True
                )
            else:
                result.category_confirmed = result.category_confidence > 0.6

            result.models_used.append("random_forest")
            steps_log.append(
                f"RF: category={result.predicted_category} "
                f"severity={result.predicted_severity} "
                f"conf={result.category_confidence:.3f}"
            )
        except Exception as e:
            steps_log.append(f"RF error: {e}")
            print(f"[PIPELINE] RF failed: {e}")

        # ── TIER 4: Isolation Forest Anomaly Detection ───────────────────────
        try:
            anomaly_features = extract_anomaly_features(
                image_input=img,
                text=text_description,
                clip_similarity=result.similarity_score,
                yolo_confidence=result.yolo_top_confidence,
                yolo_count=result.yolo_detection_count,
            )
            detector = get_anomaly_detector()
            anomaly_result = detector.predict(anomaly_features)
            result.is_anomaly = anomaly_result["is_anomaly"]
            result.anomaly_score = anomaly_result["anomaly_score"]
            result.is_fraud_or_spam = anomaly_result["is_fraud_or_spam"]
            result.anomaly_flags = anomaly_result["flags"]
            result.models_used.append("isolation_forest")
            steps_log.append(f"IF: anomaly={result.is_anomaly} score={result.anomaly_score:.3f}")
        except Exception as e:
            steps_log.append(f"IF error: {e}")
            print(f"[PIPELINE] IF failed: {e}")

        # ── Decision Logic ───────────────────────────────────────────────────
        result.decision_action = _compute_decision(result)
        steps_log.append(f"DECISION: {result.decision_action}")

    except Exception as e:
        print(f"[PIPELINE] Critical pipeline error: {e}")
        result.decision_action = "REVIEW"
        result.match_status = "REVIEW"

    finally:
        elapsed = (time.time() - t_start) * 1000
        result.processing_time_ms = int(elapsed)
        print(f"[PIPELINE] Completed in {result.processing_time_ms}ms | Steps: {steps_log}")

    return result


def _compute_decision(r: VerificationResult) -> str:
    """
    Compute the final action decision based on all tier outputs.

    Decision tree:
        REJECT              ← anomaly is spam/fraud
        FLAGGED_MISMATCH    ← image doesn't match text
        FLAGGED_ANOMALY     ← statistical anomaly detected
        PENDING_MODERATION  ← suspicious content needs human review
        APPROVE_FOR_ROUTING ← everything looks good
    """
    # Hard reject: confirmed fraud/spam
    if r.is_fraud_or_spam:
        return "REJECT"

    # Hard reject: explicit mismatch
    if r.is_match is False:
        return "FLAGGED_MISMATCH"

    # Anomaly with flags → flag for moderation
    if r.is_anomaly and r.anomaly_flags:
        return "FLAGGED_ANOMALY"

    # Suspicious similarity but not confirmed
    if r.match_status == "SUSPICIOUS":
        return "PENDING_MODERATION"

    # Low RF confidence
    if r.category_confidence < 0.4:
        return "PENDING_MODERATION"

    # All checks passed
    return "APPROVE_FOR_ROUTING"
