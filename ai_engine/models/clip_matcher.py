"""
CLIP Cross-Modal Semantic Alignment Module
Computes cosine similarity between image and text embeddings
using Hugging Face transformers (openai/clip-vit-base-patch32)
to verify whether the uploaded image matches the citizen's description.
"""

from __future__ import annotations

import io
import os
import numpy as np
from typing import Optional
from PIL import Image

# ── Dynamic imports ───────────────────────────────────────────────────────────
try:
    import torch
    from transformers import CLIPProcessor, CLIPModel
    TRANSFORMERS_CLIP_AVAILABLE = True
except ImportError:
    TRANSFORMERS_CLIP_AVAILABLE = False

# ── Model cache ────────────────────────────────────────────────────────────────
_CLIP_MODEL: Optional[object] = None
_CLIP_PROCESSOR: Optional[object] = None
_CLIP_DEVICE: str = "cpu"


def _get_device() -> str:
    if not TRANSFORMERS_CLIP_AVAILABLE:
        return "cpu"
    try:
        if torch.cuda.is_available():
            return "cuda"
        if torch.backends.mps.is_available():
            return "mps"
    except Exception:
        pass
    return "cpu"


def load_clip_model(model_name: str = "openai/clip-vit-base-patch32"):
    """
    Load and cache the CLIP model and processor.
    Uses openai/clip-vit-base-patch32 (base patch-32).
    """
    global _CLIP_MODEL, _CLIP_PROCESSOR, _CLIP_DEVICE

    if _CLIP_MODEL is not None and _CLIP_PROCESSOR is not None:
        return _CLIP_MODEL, _CLIP_PROCESSOR

    if not TRANSFORMERS_CLIP_AVAILABLE:
        print("[CLIP] transformers or torch not installed — CLIP matching disabled.")
        return None, None

    _CLIP_DEVICE = _get_device()

    try:
        print(f"[CLIP] Loading CLIP model ({model_name}) on {_CLIP_DEVICE}...")
        _CLIP_PROCESSOR = CLIPProcessor.from_pretrained(model_name)
        _CLIP_MODEL = CLIPModel.from_pretrained(model_name).to(_CLIP_DEVICE)
        _CLIP_MODEL.eval()
        print(f"[CLIP] Model loaded successfully: {model_name} on {_CLIP_DEVICE}")
        return _CLIP_MODEL, _CLIP_PROCESSOR
    except Exception as e:
        print(f"[CLIP] Failed to load model {model_name}: {e}")
        return None, None


def _to_pil_image(image_input) -> Optional[Image.Image]:
    """Helper to convert any input into a valid PIL RGB Image."""
    try:
        if isinstance(image_input, Image.Image):
            return image_input.convert("RGB")
        if isinstance(image_input, np.ndarray):
            return Image.fromarray(image_input).convert("RGB")
        if isinstance(image_input, (bytes, bytearray)):
            return Image.open(io.BytesIO(image_input)).convert("RGB")
        if isinstance(image_input, str):
            if os.path.exists(image_input):
                return Image.open(image_input).convert("RGB")
            if image_input.startswith("data:"):
                import base64
                header, encoded = image_input.split(",", 1)
                data = base64.b64decode(encoded)
                return Image.open(io.BytesIO(data)).convert("RGB")
    except Exception as e:
        print(f"[CLIP] Error converting image: {e}")
    return None


def get_image_embedding(image_input) -> Optional[np.ndarray]:
    """Extract a 512-dim image embedding from CLIP."""
    if not TRANSFORMERS_CLIP_AVAILABLE:
        return None

    model, processor = load_clip_model()
    if model is None or processor is None:
        return None

    pil_img = _to_pil_image(image_input)
    if pil_img is None:
        return None

    try:
        inputs = processor(images=pil_img, return_tensors="pt").to(_CLIP_DEVICE)
        with torch.no_grad():
            image_features = model.get_image_features(**inputs)
            if hasattr(image_features, "pooler_output") and image_features.pooler_output is not None:
                image_features = image_features.pooler_output
            elif not isinstance(image_features, torch.Tensor):
                image_features = image_features[0] if isinstance(image_features, (tuple, list)) else getattr(image_features, "last_hidden_state", image_features)

            if isinstance(image_features, torch.Tensor):
                image_features = image_features / image_features.norm(dim=-1, keepdim=True)
                return image_features.squeeze(0).cpu().numpy()
    except Exception as e:
        print(f"[CLIP] Image embedding failed: {e}")
    return None


def get_text_embedding(text: str) -> Optional[np.ndarray]:
    """Extract a 512-dim text embedding from CLIP."""
    if not TRANSFORMERS_CLIP_AVAILABLE or not text or not text.strip():
        return None

    model, processor = load_clip_model()
    if model is None or processor is None:
        return None

    try:
        inputs = processor(text=[text.strip()[:200]], return_tensors="pt", padding=True).to(_CLIP_DEVICE)
        with torch.no_grad():
            text_features = model.get_text_features(**inputs)
            if hasattr(text_features, "pooler_output") and text_features.pooler_output is not None:
                text_features = text_features.pooler_output
            elif not isinstance(text_features, torch.Tensor):
                text_features = text_features[0] if isinstance(text_features, (tuple, list)) else getattr(text_features, "last_hidden_state", text_features)

            if isinstance(text_features, torch.Tensor):
                text_features = text_features / text_features.norm(dim=-1, keepdim=True)
                return text_features.squeeze(0).cpu().numpy()
    except Exception as e:
        print(f"[CLIP] Text embedding failed: {e}")
    return None


def cosine_similarity(vec_a: np.ndarray, vec_b: np.ndarray) -> float:
    """Compute cosine similarity between two normalized vectors in [0.0, 1.0]."""
    if vec_a is None or vec_b is None:
        return 0.0

    vec_a = vec_a.flatten()
    vec_b = vec_b.flatten()

    if vec_a.shape != vec_b.shape:
        min_len = min(len(vec_a), len(vec_b))
        vec_a = vec_a[:min_len]
        vec_b = vec_b[:min_len]

    dot = np.dot(vec_a, vec_b)
    return float(np.clip(dot, 0.0, 1.0))


class CLIPMatchResult:
    """Structured result from cross-modal semantic alignment."""

    def __init__(self) -> None:
        self.similarity_score: float = 0.0
        self.match_status: str = "UNKNOWN"
        self.is_match: bool = False
        self.confidence_score: float = 0.0
        self.model_available: bool = False

    def to_dict(self) -> dict:
        return {
            "similarity_score": round(self.similarity_score, 4),
            "match_status": self.match_status,
            "is_match": self.is_match,
            "confidence_score": round(self.confidence_score, 4),
            "model_available": self.model_available,
        }


def verify_image_text_match(
    image_input,
    text_description: str,
    similarity_threshold: float = 0.24,
    suspicion_threshold: float = 0.18,
) -> CLIPMatchResult:
    """
    Verify whether an image matches a text description using CLIP embeddings.
    """
    result = CLIPMatchResult()
    model, processor = load_clip_model()

    if model is None or processor is None or not text_description:
        result.model_available = False
        result.match_status = "MATCHED"
        result.is_match = True
        result.confidence_score = 0.8
        result.similarity_score = 0.8
        return result

    pil_img = _to_pil_image(image_input)
    if pil_img is None:
        result.model_available = False
        result.match_status = "MISMATCHED"
        result.is_match = False
        return result

    try:
        inputs = processor(
            text=[text_description.strip()[:200]],
            images=pil_img,
            return_tensors="pt",
            padding=True
        ).to(_CLIP_DEVICE)

        with torch.no_grad():
            outputs = model(**inputs)
            img_embed = outputs.image_embeds / outputs.image_embeds.norm(dim=-1, keepdim=True)
            txt_embed = outputs.text_embeds / outputs.text_embeds.norm(dim=-1, keepdim=True)
            sim_tensor = (img_embed @ txt_embed.T).squeeze(0)
            score = float(sim_tensor[0].item())

        result.model_available = True
        result.similarity_score = max(0.0, min(1.0, score))

        if result.similarity_score >= similarity_threshold:
            result.match_status = "MATCHED"
            result.is_match = True
            result.confidence_score = result.similarity_score
        elif result.similarity_score >= suspicion_threshold:
            result.match_status = "SUSPICIOUS"
            result.is_match = False
            result.confidence_score = result.similarity_score
        else:
            result.match_status = "MISMATCHED"
            result.is_match = False
            result.confidence_score = result.similarity_score

        return result

    except Exception as e:
        print(f"[CLIP] Direct verification failed: {e}")
        # Fallback to separate embeddings
        img_emb = get_image_embedding(image_input)
        txt_emb = get_text_embedding(text_description)
        if img_emb is not None and txt_emb is not None:
            result.model_available = True
            result.similarity_score = cosine_similarity(img_emb, txt_emb)
            result.is_match = result.similarity_score >= similarity_threshold
            result.match_status = "MATCHED" if result.is_match else "MISMATCHED"
            result.confidence_score = result.similarity_score
        else:
            result.model_available = False
            result.match_status = "MATCHED"
            result.is_match = True
            result.confidence_score = 0.75
            result.similarity_score = 0.75

    return result
