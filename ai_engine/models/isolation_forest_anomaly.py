"""
Isolation Forest Anomaly Detector
Identifies spam, fraud, corrupted files, memes, stock photos,
and out-of-distribution civic incident submissions.
"""

from __future__ import annotations

import os
import pickle
import numpy as np
from typing import Optional
from pathlib import Path

from PIL import Image

# ── Constants ──────────────────────────────────────────────────────────────────
ANOMALY_FLAGS = {
    "BLANK_IMAGE": "Image appears blank or entirely dark",
    "OVEREXPOSED": "Image is overexposed or entirely white",
    "VERY_DARK": "Image is extremely dark — likely taken at night without flash",
    "MISMATCHED_CONTENT": "Image content does not match the text description",
    "LOW_INFORMATION": "Image has very low edge/texture information",
    "EXTREME_ASPECT_RATIO": "Image has an unusual aspect ratio (likely cropped or screenshot)",
    "LOW_YOLO_CONFIDENCE": "No recognizable objects detected with confidence",
    "SIMILARITY_TOO_LOW": "Image-text semantic similarity is very low",
    "SUSPICIOUS_CONTENT": "Content flagged as statistically anomalous by isolation forest",
}

CIVIC_LABELS = [
    "ROAD_POTHOLE", "GARBAGE_OVERFLOW", "BROKEN_STREETLIGHT",
    "WATER_LEAKAGE", "DRAINAGE_BLOCKAGE", "TRAFFIC_SIGNAL_DAMAGED",
    "PUBLIC_INFRA_DAMAGE", "ELECTRICAL_HAZARD", "OPEN_MANHOLE",
    "SEWAGE_OVERFLOW", "FLOOD", "ILLEGAL_CONSTRUCTION",
]


def extract_anomaly_features(image_input, text: str = "",
                             clip_similarity: float = 0.0,
                             yolo_confidence: float = 0.0,
                             yolo_count: int = 0) -> np.ndarray:
    """
    Build a feature vector for anomaly detection.

    Features:
        [0]  brightness              — very dark or overexposed images
        [1]  edge_density            — blank/white images have near-zero edges
        [2]  is_extreme_aspect_ratio — screenshots, cropped images
        [3]  text_length_norm        — empty descriptions are suspicious
        [4]  clip_similarity         — very low = mismatch/anomaly
        [5]  yolo_confidence         — no detection = suspicious
        [6]  yolo_count_norm         — too many objects = busy scene
        [7]  color_variance          — stock photos vs real photos differ
        [8]  bottom_region_interest  — civic issues are usually ground-level
        [9]  horizontal_line_score   — screenshots have many horizontal lines
    """
    features = np.zeros(10, dtype=np.float32)

    try:
        img = image_input.convert("RGB") if not isinstance(image_input, Image.Image) else image_input.convert("RGB")
        arr = np.array(img, dtype=np.float32)
        h, w = arr.shape[:2]

        # [0] Brightness
        gray = arr.mean(axis=2)
        features[0] = float(gray.mean()) / 255.0

        # [1] Edge density (Laplacian variance)
        try:
            from scipy.ndimage import laplace
            lap = laplace(gray)
            features[1] = min(float(lap.var()) / 10000.0, 1.0)
        except ImportError:
            dx = np.abs(arr[:, 1:] - arr[:, :-1]).mean()
            dy = np.abs(arr[1:] - arr[:-1]).mean()
            features[1] = float((dx + dy) / 2.0) / 255.0

        # [2] Extreme aspect ratio (screenshots, cropped, weird)
        features[2] = 1.0 if (w / max(h, 1) > 3.0 or h / max(w, 1) > 3.0) else 0.0

        # [3] Text length (normalized)
        words = text.split() if text else []
        features[3] = min(len(words) / 50.0, 1.0)

        # [4] CLIP similarity
        features[4] = clip_similarity

        # [5] YOLO confidence
        features[5] = yolo_confidence

        # [6] YOLO count (normalized)
        features[6] = min(yolo_count / 10.0, 1.0)

        # [7] Color variance (real photos have higher variance than screenshots/memes)
        features[7] = min(float(arr.std()) / 100.0, 1.0)

        # [8] Bottom region interest (civic issues are usually in lower half of image)
        bottom_half = arr[h // 2:, :, :]
        bottom_edges = np.abs(bottom_half[:, 1:] - bottom_half[:, :-1]).mean()
        total_edges = np.abs(arr[:, 1:] - arr[:, :-1]).mean()
        features[8] = float(bottom_edges / max(total_edges, 1e-6))

        # [9] Horizontal line score (screenshots have many horizontal lines)
        h_grad = np.abs(arr[1:] - arr[:-1]).mean(axis=(1, 2))
        strong_h_lines = np.sum(h_grad > (arr.mean() * 0.15))
        features[9] = min(strong_h_lines / max(h - 1, 1), 1.0)

    except Exception as e:
        print(f"[IF] Feature extraction error: {e}")

    return features


# ── Isolation Forest ───────────────────────────────────────────────────────────
class AnomalyDetector:
    """
    Isolation Forest based anomaly detector for civic report submissions.
    Trains on a mix of synthetic civic images and known anomaly patterns.
    """

    def __init__(self, model_dir: str = "ai_engine/models"):
        self.model_dir = Path(model_dir)
        self.model = None
        self._trained = False
        self.scaler_mean: np.ndarray | None = None
        self.scaler_std: np.ndarray | None = None

    def _generate_training_data(self, n_normal: int = 1500, n_anomaly: int = 500):
        """
        Generate synthetic training data.

        Normal civic images: moderate brightness, some edges, outdoor,
        ground-level content, low horizontal lines, some yolo detections.

        Anomalies: blank (dark/bright), screenshots (high horiz lines),
        stock photos (high color variance, few civic objects), memes.
        """
        np.random.seed(42)

        # Normal civic images
        normal = np.zeros((n_normal, 10), dtype=np.float32)
        for i in range(n_normal):
            normal[i, 0] = np.random.uniform(0.15, 0.75)   # brightness
            normal[i, 1] = np.random.uniform(0.05, 0.6)    # edge density
            normal[i, 2] = 0.0                               # normal aspect
            normal[i, 3] = np.random.uniform(0.3, 1.0)      # has description
            normal[i, 4] = np.random.uniform(0.25, 0.9)     # clip similarity
            normal[i, 5] = np.random.uniform(0.3, 0.95)     # yolo conf
            normal[i, 6] = np.random.uniform(0.0, 0.8)      # yolo count
            normal[i, 7] = np.random.uniform(0.05, 0.5)     # color variance
            normal[i, 8] = np.random.uniform(0.4, 0.9)      # bottom interest
            normal[i, 9] = np.random.uniform(0.0, 0.15)     # horiz lines

        # Anomalous submissions
        anomaly = np.zeros((n_anomaly, 10), dtype=np.float32)
        for i in range(n_anomaly):
            anomaly_type = i % 5

            if anomaly_type == 0:  # Blank/dark image
                anomaly[i, 0] = np.random.uniform(0.0, 0.05)   # very dark
                anomaly[i, 1] = np.random.uniform(0.0, 0.02)   # no edges
                anomaly[i, 3] = np.random.choice([0.0, 0.1])   # no text
            elif anomaly_type == 1:  # Screenshot
                anomaly[i, 0] = np.random.uniform(0.5, 0.9)
                anomaly[i, 1] = np.random.uniform(0.01, 0.05)
                anomaly[i, 9] = np.random.uniform(0.4, 0.9)    # many horiz lines
            elif anomaly_type == 2:  # Stock photo / unrelated
                anomaly[i, 4] = np.random.uniform(0.0, 0.15)   # low clip sim
                anomaly[i, 5] = np.random.uniform(0.0, 0.1)    # no yolo
                anomaly[i, 7] = np.random.uniform(0.6, 1.0)    # high variance
            elif anomaly_type == 3:  # Overexposed/white
                anomaly[i, 0] = np.random.uniform(0.9, 1.0)
                anomaly[i, 1] = np.random.uniform(0.0, 0.03)
            else:  # Meme / manipulated
                anomaly[i, 7] = np.random.uniform(0.3, 0.8)
                anomaly[i, 4] = np.random.uniform(0.05, 0.2)
                anomaly[i, 9] = np.random.uniform(0.2, 0.6)

        X = np.vstack([normal, anomaly])
        y = np.hstack([np.zeros(n_normal), np.ones(n_anomaly)])  # 0=normal, 1=anomaly

        return X, y

    def train(self, force_retrain: bool = False):
        """Train the Isolation Forest model."""
        if self._trained and not force_retrain:
            return self

        from sklearn.ensemble import IsolationForest
        from sklearn.preprocessing import StandardScaler

        model_path = self.model_dir / "isolation_forest_model.pkl"
        scaler_path = self.model_dir / "if_scaler.pkl"

        if model_path.exists() and not force_retrain:
            try:
                with open(model_path, "rb") as f:
                    self.model = pickle.load(f)
                with open(scaler_path, "rb") as f:
                    scaler = pickle.load(f)
                self.scaler_mean = scaler.mean_
                self.scaler_std = scaler.scale_
                self._trained = True
                print("[IF] Loaded pre-trained model from disk.")
                return self
            except Exception:
                pass

        print("[IF] Training Isolation Forest...")
        X, y = self._generate_training_data()

        # Standardize features
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        self.scaler_mean = scaler.mean_
        self.scaler_std = scaler.scale_

        # Train only on normal samples (unsupervised)
        X_normal = X_scaled[y == 0]

        self.model = IsolationForest(
            n_estimators=150,
            max_samples="auto",
            contamination=0.2,  # ~20% of training data is anomalous
            random_state=42,
            n_jobs=-1,
        )
        self.model.fit(X_normal)

        # Save
        self.model_dir.mkdir(parents=True, exist_ok=True)
        with open(model_path, "wb") as f:
            pickle.dump(self.model, f)
        with open(scaler_path, "wb") as f:
            pickle.dump(scaler, f)

        self._trained = True
        print("[IF] Model trained and saved.")
        return self

    def predict(self, feature_vector: np.ndarray) -> dict:
        """
        Run anomaly detection on a feature vector.

        Returns dict with:
            is_anomaly (bool), anomaly_score (float), flags (list[str])
        """
        if self.model is None:
            self.train()

        try:
            fv = feature_vector.reshape(1, -1)

            if self.scaler_mean is not None and self.scaler_std is not None:
                fv = (fv - self.scaler_mean) / np.maximum(self.scaler_std, 1e-8)

            # Isolation Forest: -1 = anomaly, 1 = normal
            prediction = self.model.predict(fv)[0]
            score = self.model.decision_function(fv)[0]  # lower = more anomalous

            is_anomaly = prediction == -1
            anomaly_score = round(float(np.clip(-score, 0.0, 1.0)), 4)

            # Determine specific flags
            flags = []
            fv_flat = feature_vector.flatten()

            # Rule-based flags as supplements
            if fv_flat[0] < 0.05:
                flags.append("BLANK_IMAGE")
            if fv_flat[0] > 0.95:
                flags.append("OVEREXPOSED")
            if fv_flat[4] < 0.15 and fv_flat[5] < 0.15:
                flags.append("LOW_YOLO_CONFIDENCE")
            if fv_flat[4] < 0.1:
                flags.append("SIMILARITY_TOO_LOW")
            if fv_flat[9] > 0.35:
                flags.append("EXTREME_ASPECT_RATIO")
            if fv_flat[1] < 0.02:
                flags.append("LOW_INFORMATION")
            if fv_flat[3] < 0.1:
                flags.append("LOW_INFORMATION")
            if is_anomaly and not flags:
                flags.append("SUSPICIOUS_CONTENT")

            return {
                "is_anomaly": bool(is_anomaly),
                "anomaly_score": anomaly_score,
                "flags": flags,
                "is_fraud_or_spam": bool(is_anomaly and anomaly_score > 0.5),
            }

        except Exception as e:
            print(f"[IF] Prediction error: {e}")
            return {
                "is_anomaly": False,
                "anomaly_score": 0.0,
                "flags": [],
                "is_fraud_or_spam": False,
            }


# ── Singleton ──────────────────────────────────────────────────────────────────
_detector_instance: Optional[AnomalyDetector] = None


def get_anomaly_detector() -> AnomalyDetector:
    global _detector_instance
    if _detector_instance is None:
        _detector_instance = AnomalyDetector()
        _detector_instance.train()
    return _detector_instance
