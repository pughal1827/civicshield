"""
YOLOv8 Civic Object & Hazard Detector
Detects physical civic objects and hazards in citizen-uploaded images.
Falls back gracefully when GPU is unavailable.
"""

from __future__ import annotations

import numpy as np
from PIL import Image
from typing import Optional
import os

# ── Type stubs (avoid hard dependency at import time) ──────────────────────────
try:
    from ultralytics import YOLO
    ULTRALYTICS_AVAILABLE = True
except ImportError:
    ULTRALYTICS_AVAILABLE = False

# ── Constants ──────────────────────────────────────────────────────────────────
CIVIC_OBJECT_CLASSES: dict[int, str] = {
    0:  "person",
    1:  "bicycle",
    2:  "car",
    3:  "motorcycle",
    5:  "bus",
    7:  "truck",
    14: "bird",        # not useful — kept for COCO completeness
    15: "cat",
    16: "dog",
    24: "backpack",
    26: "handbag",
    28: "suitcase",
    39: "bottle",
    41: "cup",
    56: "chair",
    57: "couch",
    58: "potted_plant",
    62: "tv",
    63: "laptop",
    67: "cell_phone",
}

# Mapping from COCO class id → civic hazard label (manual override)
COCO_TO_CIVIC: dict[int, str] = {
    0:  "person",      # crowd density indicator
    2:  "vehicle",     # traffic / parking violation
    3:  "vehicle",
    5:  "vehicle",
    7:  "vehicle",
}

# Hazard-relevant labels we care about for civic reporting
RELEVANT_CIVIC_LABELS = {
    "pothole",
    "garbage",
    "street_light",
    "water_leak",
    "crack",
    "fire",
    "manhole",
    "vehicle",
    "crowd",
    "debris",
    "trash",
    "flood",
    "leak",
    "broken",
    "damage",
}

# ── Model loading ─────────────────────────────────────────────────────────────
_MODEL_CACHE: Optional[object] = None
_MODEL_DEVICE: str = "cpu"


def get_device() -> str:
    """Return the best available compute device."""
    if not ULTRALYTICS_AVAILABLE:
        return "cpu"
    try:
        import torch
        if torch.cuda.is_available():
            return "cuda"
        if torch.backends.mps.is_available():
            return "mps"
    except Exception:
        pass
    return "cpu"


def load_model(model_name: str = "yolov8n.pt") -> Optional[object]:
    """
    Load (and cache) the YOLOv8 model.
    Uses yolov8n.pt (nano) for speed — ~6MB, works fine on CPU.
    Falls back to yolov8s.pt if available.
    """
    global _MODEL_CACHE, _MODEL_DEVICE

    if _MODEL_CACHE is not None:
        return _MODEL_CACHE

    if not ULTRALYTICS_AVAILABLE:
        print("[YOLO] ultralytics not installed — YOLO detection disabled.")
        return None

    _MODEL_DEVICE = get_device()

    # Prefer nano for speed; try loading
    candidates = [model_name, "yolov8n.pt"]

    for candidate in candidates:
        try:
            _MODEL_CACHE = YOLO(candidate)
            print(f"[YOLO] Model loaded: {candidate} on {_MODEL_DEVICE}")
            return _MODEL_CACHE
        except Exception as e:
            print(f"[YOLO] Failed to load {candidate}: {e}")

    print("[YOLO] No YOLO model could be loaded.")
    return None


def preprocess_image(image_input) -> Image.Image:
    """Accept file path, bytes, PIL Image, or numpy array → return PIL Image."""
    if isinstance(image_input, Image.Image):
        return image_input.convert("RGB")
    if isinstance(image_input, np.ndarray):
        return Image.fromarray(image_input).convert("RGB")
    if isinstance(image_input, (bytes, bytearray)):
        from io import BytesIO
        return Image.open(BytesIO(image_input)).convert("RGB")
    if isinstance(image_input, str):
        return Image.open(image_input).convert("RGB")
    raise TypeError(f"Unsupported image type: {type(image_input)}")


# ── Detection ─────────────────────────────────────────────────────────────────
class YOLODetectionResult:
    """Structured result from YOLO inference."""

    def __init__(self) -> None:
        self.detections: list[dict] = []
        self.detection_count: int = 0
        self.top_confidence: float = 0.0
        self.labels: list[str] = []
        self.model_loaded: bool = False

    def to_dict(self) -> dict:
        return {
            "detections": self.detections,
            "detection_count": self.detection_count,
            "top_confidence": round(self.top_confidence, 4),
            "labels": self.labels,
            "model_loaded": self.model_loaded,
        }


def detect(
    image_input,
    confidence_threshold: float = 0.35,
    iou_threshold: float = 0.45,
) -> YOLODetectionResult:
    """
    Run YOLOv8 inference on the image and return structured detections.

    Parameters
    ----------
    image_input : PIL Image | bytes | str | np.ndarray
        The image to analyze.
    confidence_threshold : float
        Minimum confidence to include a detection.
    iou_threshold : float
        NMS IoU threshold.

    Returns
    -------
    YOLODetectionResult
        Structured detection results.
    """
    result = YOLODetectionResult()
    model = load_model()

    if model is None:
        return result

    result.model_loaded = True

    try:
        img = preprocess_image(image_input)
    except Exception as e:
        print(f"[YOLO] Image preprocessing failed: {e}")
        return result

    try:
        predictions = model.predict(
            source=img,
            conf=confidence_threshold,
            iou=iou_threshold,
            device=_MODEL_DEVICE,
            verbose=False,
        )

        if not predictions or len(predictions) == 0:
            return result

        pred = predictions[0]

        if pred.boxes is None or len(pred.boxes) == 0:
            return result

        boxes_xyxy = pred.boxes.xyxy.cpu().numpy()
        confidences = pred.boxes.conf.cpu().numpy()
        class_ids = pred.boxes.cls.cpu().numpy().astype(int)

        result.detection_count = len(boxes_xyxy)

        for i in range(len(boxes_xyxy)):
            x1, y1, x2, y2 = boxes_xyxy[i]
            conf = float(confidences[i])
            cls_id = int(class_ids[i])

            # Map COCO class → civic label
            raw_label = model.names.get(cls_id, f"class_{cls_id}")
            civic_label = COCO_TO_CIVIC.get(cls_id, raw_label)

            detection = {
                "label": civic_label,
                "raw_label": raw_label,
                "confidence": round(conf, 4),
                "bounding_box": [
                    int(x1),  # x_min
                    int(y1),  # y_min
                    int(x2),  # x_max
                    int(y2),  # y_max
                ],
                "class_id": cls_id,
            }
            result.detections.append(detection)
            result.labels.append(civic_label)

            if conf > result.top_confidence:
                result.top_confidence = conf

    except Exception as e:
        print(f"[YOLO] Inference error: {e}")

    return result


def get_civic_hazard_labels(detection_result: YOLODetectionResult) -> list[str]:
    """
    Return only the labels that match known civic hazards.
    Filters the detection result to relevant civic objects.
    """
    return [
        lbl for lbl in detection_result.labels
        if lbl.lower() in RELEVANT_CIVIC_LABELS
    ]
