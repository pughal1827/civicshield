"""
Random Forest Classification & Severity Engine
Predicts civic incident category and severity level from multi-modal features.
"""

from __future__ import annotations

import os
import json
import pickle
import numpy as np
from typing import Optional
from pathlib import Path

# ── Feature engineering ────────────────────────────────────────────────────────
from PIL import Image

CIVIC_CATEGORIES = [
    "ROAD_POTHOLE",
    "GARBAGE_OVERFLOW",
    "BROKEN_STREETLIGHT",
    "WATER_LEAKAGE",
    "DRAINAGE_BLOCKAGE",
    "TRAFFIC_SIGNAL_DAMAGED",
    "PUBLIC_INFRA_DAMAGE",
    "ELECTRICAL_HAZARD",
    "OPEN_MANHOLE",
    "SEWAGE_OVERFLOW",
    "FLOOD",
    "ILLEGAL_CONSTRUCTION",
]

SEVERITY_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]


def extract_image_features(image_input) -> dict:
    """
    Extract low-level image features without a deep model.

    Returns dict with:
        aspect_ratio, brightness, sharpness, edge_density
    """
    features = {
        "aspect_ratio": 1.0,
        "brightness": 0.0,
        "sharpness": 0.0,
        "edge_density": 0.0,
    }

    try:
        img = image_input.convert("RGB") if not isinstance(image_input, Image.Image) else image_input.convert("RGB")
        arr = np.array(img, dtype=np.float32)

        # Aspect ratio
        h, w = arr.shape[:2]
        features["aspect_ratio"] = round(w / max(h, 1), 4)

        # Brightness (mean of grayscale)
        gray = arr.mean(axis=2)
        features["brightness"] = round(float(gray.mean()) / 255.0, 4)

        # Sharpness (Laplacian variance)
        from scipy.ndimage import laplace
        lap = laplace(gray)
        features["sharpness"] = round(float(lap.var()), 4)

        # Edge density (Canny approximation via gradient magnitude)
        dx = np.abs(arr[:, 1:] - arr[:, :-1]).mean()
        dy = np.abs(arr[1:, :] - arr[:-1, :]).mean()
        features["edge_density"] = round(float((dx + dy) / 2.0) / 255.0, 4)

    except Exception as e:
        print(f"[RF] Image feature extraction error: {e}")

    return features


def extract_text_features(text: str) -> dict:
    """
    Extract simple text features from the citizen description.

    Returns dict with:
        text_length, keyword_density, sentiment_score
    """
    features = {
        "text_length": 0.0,
        "keyword_density": 0.0,
        "sentiment_score": 0.0,
    }

    if not text:
        return features

    text_lower = text.lower()
    words = text_lower.split()
    features["text_length"] = float(len(words))

    # Civic keyword density
    CIVIC_KEYWORDS = [
        "pothole", "hole", "crack", "road", "street", "damage", "broken",
        "garbage", "trash", "waste", "overflow", "dirty", "filthy",
        "water", "leak", "flood", "drain", "blocked", "overflowing",
        "light", "lamp", "dark", "electric", "wire", "power",
        "sewage", "manhole", "open", "smell", "stink",
        "traffic", "signal", "light", "jam", "congestion",
        "construction", "illegal", "building", "encroach",
        "urgent", "emergency", "danger", "hazard", "risk", "injury",
        "car", "accident", "vehicle", "collision",
    ]

    keyword_hits = sum(1 for kw in CIVIC_KEYWORDS if kw in text_lower)
    features["keyword_density"] = round(keyword_hits / max(len(words), 1), 4)

    # Simple sentiment: presence of urgent/negative vs neutral words
    negative_words = ["danger", "urgent", "emergency", "broken", "blocked", "overflow",
                      "risk", "hazard", "bad", "severe", "serious", "critical"]
    positive_words = ["fixed", "resolved", "cleaned", "repaired", "normal"]

    neg_count = sum(1 for w in negative_words if w in text_lower)
    pos_count = sum(1 for w in positive_words if w in text_lower)

    # -1.0 (very negative/urgent) to +1.0 (resolved/positive)
    total = neg_count + pos_count + 1
    features["sentiment_score"] = round((pos_count - neg_count) / total, 4)

    return features


def build_feature_vector(
    clip_similarity: float = 0.0,
    yolo_top_confidence: float = 0.0,
    yolo_detection_count: int = 0,
    yolo_labels: list[str] | None = None,
    text: str = "",
    image_features: dict | None = None,
) -> np.ndarray:
    """
    Build a unified multi-modal feature vector for the Random Forest.

    Feature vector layout (10 dimensions):
        [0]  clip_similarity
        [1]  yolo_top_confidence
        [2]  yolo_detection_count (normalized)
        [3]  has_relevant_civic_object (0 or 1)
        [4]  text_length (normalized)
        [5]  keyword_density
        [6]  sentiment_score
        [7]  aspect_ratio
        [8]  brightness
        [9]  edge_density
    """
    yolo_labels = yolo_labels or []
    img_feats = image_features or {}

    has_civic_object = 1.0 if any(
        lbl in yolo_labels for lbl in
        ["pothole", "garbage", "trash", "water_leak", "flood", "fire",
         "manhole", "vehicle", "debris", "broken", "crack"]
    ) else 0.0

    # Normalize text length (cap at 200 words)
    text_length_norm = min(len(text.split()) / 200.0, 1.0)

    feature_vector = np.array([
        clip_similarity,
        yolo_top_confidence,
        min(yolo_detection_count / 10.0, 1.0),
        has_civic_object,
        text_length_norm,
        extract_text_features(text)["keyword_density"],
        extract_text_features(text)["sentiment_score"],
        img_feats.get("aspect_ratio", 1.0),
        img_feats.get("brightness", 0.0),
        img_feats.get("edge_density", 0.0),
    ], dtype=np.float32)

    return feature_vector


# ── Model ──────────────────────────────────────────────────────────────────────
class SeverityClassifier:
    """
    Random Forest classifier for civic incident category and severity prediction.

    Uses scikit-learn's RandomForestClassifier.
    Trains on synthetic data when no pre-trained model is available.
    """

    def __init__(self, model_dir: str = "ai_engine/models"):
        self.model_dir = Path(model_dir)
        self.category_model = None
        self.severity_model = None
        self._trained = False

    def _generate_training_data(self, n_samples: int = 2000):
        """
        Generate synthetic training data for demo/development.
        In production, replace with real labeled civic incident data.
        """
        np.random.seed(42)

        # Feature: [clip_sim, yolo_conf, yolo_count_norm, has_civic_obj,
        #           text_len_norm, kw_density, sentiment, aspect_ratio, brightness, edge_density]
        X = np.random.rand(n_samples, 10).astype(np.float32)

        # Bias features to create realistic patterns
        # Higher clip_sim + civic object → specific categories
        for i in range(n_samples):
            clip_sim = X[i, 0]
            has_obj = X[i, 3]
            kw_dens = X[i, 5]
            brightness = X[i, 8]

            # Severity: influenced by urgency keywords + brightness + object presence
            urgency = kw_dens * 2.0 + has_obj * 1.5 + (1.0 - brightness) * 0.5
            X[i, 1] = min(1.0, X[i, 1] + has_obj * 0.3)  # yolo conf boosted by objects

        # Category labels (0-11)
        category_probs = np.zeros((n_samples, 12))
        for i in range(n_samples):
            cat = i % 12
            category_probs[i, cat] = 0.7
            category_probs[i, (cat + 1) % 12] = 0.15
            category_probs[i, (cat + 2) % 12] = 0.1
            category_probs[i, (cat + 3) % 12] = 0.05

        y_category = np.argmax(category_probs + np.random.rand(n_samples, 12) * 0.3, axis=1)

        # Severity labels (0-3: LOW, MEDIUM, HIGH, CRITICAL)
        severity = np.zeros(n_samples, dtype=int)
        for i in range(n_samples):
            base = X[i, 5] + X[i, 3] + X[i, 1]  # kw_density + civic_obj + yolo_conf
            if base > 2.0:
                severity[i] = 3  # CRITICAL
            elif base > 1.3:
                severity[i] = 2  # HIGH
            elif base > 0.7:
                severity[i] = 1  # MEDIUM
            else:
                severity[i] = 0  # LOW

        y_severity = severity

        return X, y_category, y_severity

    def train(self, force_retrain: bool = False):
        """
        Train the Random Forest models.
        Saves models to disk for reuse.
        """
        if self._trained and not force_retrain:
            return self

        from sklearn.ensemble import RandomForestClassifier

        model_path_cat = self.model_dir / "rf_category_model.pkl"
        model_path_sev = self.model_dir / "rf_severity_model.pkl"

        if model_path_cat.exists() and model_path_sev.exists() and not force_retrain:
            try:
                with open(model_path_cat, "rb") as f:
                    self.category_model = pickle.load(f)
                with open(model_path_sev, "rb") as f:
                    self.severity_model = pickle.load(f)
                self._trained = True
                print("[RF] Loaded pre-trained models from disk.")
                return self
            except Exception:
                pass

        print("[RF] Training Random Forest models...")
        X, y_cat, y_sev = self._generate_training_data()

        self.category_model = RandomForestClassifier(
            n_estimators=100,
            max_depth=12,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1,
        )
        self.category_model.fit(X, y_cat)

        self.severity_model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1,
        )
        self.severity_model.fit(X, y_sev)

        # Save to disk
        self.model_dir.mkdir(parents=True, exist_ok=True)
        with open(model_path_cat, "wb") as f:
            pickle.dump(self.category_model, f)
        with open(model_path_sev, "wb") as f:
            pickle.dump(self.severity_model, f)

        self._trained = True
        print("[RF] Models trained and saved.")
        return self

    def predict(self, feature_vector: np.ndarray) -> dict:
        """
        Run inference on a feature vector.

        Returns dict with:
            predicted_category, predicted_severity,
            category_confidence, severity_confidence
        """
        if self.category_model is None or self.severity_model is None:
            self.train()

        try:
            fv = feature_vector.reshape(1, -1)

            cat_probs = self.category_model.predict_proba(fv)[0]
            cat_pred = int(np.argmax(cat_probs))
            cat_conf = float(cat_probs[cat_pred])

            sev_probs = self.severity_model.predict_proba(fv)[0]
            sev_pred = int(np.argmax(sev_probs))
            sev_conf = float(sev_probs[sev_pred])

            return {
                "predicted_category": CIVIC_CATEGORIES[cat_pred],
                "predicted_severity": SEVERITY_LEVELS[sev_pred],
                "category_confidence": round(cat_conf, 4),
                "severity_confidence": round(sev_conf, 4),
            }

        except Exception as e:
            print(f"[RF] Prediction error: {e}")
            return {
                "predicted_category": "PUBLIC_INFRA_DAMAGE",
                "predicted_severity": "MEDIUM",
                "category_confidence": 0.5,
                "severity_confidence": 0.5,
            }


# ── Singleton ──────────────────────────────────────────────────────────────────
_classifier_instance: Optional[SeverityClassifier] = None


def get_classifier() -> SeverityClassifier:
    global _classifier_instance
    if _classifier_instance is None:
        _classifier_instance = SeverityClassifier()
        _classifier_instance.train()
    return _classifier_instance
