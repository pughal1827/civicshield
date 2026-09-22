"""
CivicShield AI Engine
4-Tier Multi-Modal AI Pipeline for Civic Incident Verification
==============================================================

Tiers:
    1. YOLOv8 Object Detection     — real-time hazard detection
    2. CLIP Cross-Modal Alignment   — image-text consistency verification
    3. Random Forest Classification — category + severity prediction
    4. Isolation Forest Anomaly      — fraud/spam/misinformation detection

Usage:
    from civicshield.ai_engine.pipeline import run_verification_pipeline
    result = run_verification_pipeline(image_bytes, description)
"""

from .pipeline import run_verification_pipeline, VerificationResult
from .models.yolo_detector import get_detector, load_model
from .models.clip_matcher import load_clip_model, verify_image_text_match
from .models.rf_severity_classifier import get_classifier
from .models.isolation_forest_anomaly import get_anomaly_detector

__version__ = "1.0.0"
__all__ = [
    "run_verification_pipeline",
    "VerificationResult",
    "get_detector",
    "load_model",
    "load_clip_model",
    "verify_image_text_match",
    "get_classifier",
    "get_anomaly_detector",
]
