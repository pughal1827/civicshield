"""
CLIP Cross-Modal Semantic Alignment Module
Computes cosine similarity between image and text embeddings
to verify whether the uploaded image matches the citizen's description.
"""

from __future__ import annotations

import numpy as np
from typing import Optional
import os

# ── Optional imports ───────────────────────────────────────────────────────────
try:
    import torch
    import clip
    from PIL import Image
    CLIP_AVAILABLE = True
except ImportError:
    CLIP_AVAILABLE = False

# ── Model cache ────────────────────────────────────────────────────────────────
_CLIP_MODEL = None
_CLIP_DEVICE: str = "cpu"


def _get_device() -> str:
    if not CLIP_AVAILABLE:
        return "cpu"
    try:
        if torch.cuda.is_available():
            return "cuda"
        if torch.backends.mps.is_available():
            return "mps"
    except Exception:
        pass
    return "cpu"


def load_clip_model(model_name: str = "ViT-B/32"):
    """
    Load and cache the CLIP model.
    Uses ViT-B/32 (base patch-32) — ~350MB, good speed/accuracy tradeoff.
    Falls back gracefully if torch/clip are unavailable.
    """
    global _CLIP_MODEL, _CLIP_DEVICE

    if _CLIP_MODEL is not None:
        return _CLIP_MODEL

    if not CLIP_AVAILABLE:
        print("[CLIP] torch or clip not installed — CLIP matching disabled.")
        return None

    _CLIP_DEVICE = _get_device()

    try:
        _CLIP_MODEL, preprocess = clip.load(model_name, device=_CLIP_DEVICE)
        _CLIP_MODEL.eval()
        print(f"[CLIP] Model loaded: {model_name} on {_CLIP_DEVICE}")
        return _CLIP_MODEL
    except Exception as e:
        print(f"[CLIP] Failed to load model: {e}")
        return None


# ── Embedding extraction ───────────────────────────────────────────────────────
@torch.no_grad()
def get_image_embedding(image_input) -> Optional[np.ndarray]:
    """
    Extract a 512-dim image embedding from CLIP.

    Parameters
    ----------
    image_input : PIL Image | bytes | str | np.ndarray
        Image to embed.

    Returns
    -------
    np.ndarray | None
        L2-normalized 512-dim embedding vector, or None on failure.
    """
    if not CLIP_AVAILABLE:
        return None

    model = load_clip_model()
    if model is None:
        return None

    try:
        from io import BytesIO

        if isinstance(image_input, bytes):
            image_input = Image.open(BytesIO(image_input)).convert("RGB")
        elif isinstance(image_input, str):
            image_input = Image.open(image_input).convert("RGB")
        elif isinstance(image_input, np.ndarray):
            image_input = Image.fromarray(image_input).convert("RGB")

        image_input = image_input.convert("RGB")

        # CLIP preprocess
        _, preprocess = clip.load("ViT-B/32", device=_CLIP_DEVICE)
        image_tensor = preprocess(image_input).unsqueeze(0).to(_CLIP_DEVICE)

        embedding = model.encode_image(image_tensor)
        embedding = embedding / embedding.norm(dim=-1, keepdim=True)

        return embedding.squeeze(0).cpu().numpy()

    except Exception as e:
        print(f"[CLIP] Image embedding failed: {e}")
        return None


@torch.no_grad()
def get_text_embedding(text: str) -> Optional[np.ndarray]:
    """
    Extract a 512-dim text embedding from CLIP.

    Parameters
    ----------
    text : str
        Text description to embed.

    Returns
    -------
    np.ndarray | None
        L2-normalized 512-dim embedding vector, or None on failure.
    """
    if not CLIP_AVAILABLE or not text or not text.strip():
        return None

    model = load_clip_model()
    if model is None:
        return None

    try:
        # CLIP requires token truncation at 77 tokens
        tokenized = clip.tokenize([text.strip()], truncate=True).to(_CLIP_DEVICE)

        embedding = model.encode_text(tokenized)
        embedding = embedding / embedding.norm(dim=-1, keepdim=True)

        return embedding.squeeze(0).cpu().numpy()

    except Exception as e:
        print(f"[CLIP] Text embedding failed: {e}")
        return None


# ── Cosine similarity ─────────────────────────────────────────────────────────
def cosine_similarity(vec_a: np.ndarray, vec_b: np.ndarray) -> float:
    """
    Compute cosine similarity between two vectors.
    Assumes vectors are L2-normalized (dot product = cosine similarity).

    Returns a value in [0.0, 1.0] where:
      1.0 = identical meaning
      0.0 = completely unrelated
    """
    if vec_a is None or vec_b is None:
        return 0.0

    # Ensure 1-D
    vec_a = vec_a.flatten()
    vec_b = vec_b.flatten()

    if vec_a.shape != vec_b.shape:
        min_len = min(len(vec_a), len(vec_b))
        vec_a = vec_a[:min_len]
        vec_b = vec_b[:min_len]

    dot = np.dot(vec_a, vec_b)
    return float(np.clip(dot, 0.0, 1.0))


# ── Main verification function ────────────────────────────────────────────────
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
    similarity_threshold: float = 0.35,
    suspicion_threshold: float = 0.25,
) -> CLIPMatchResult:
    """
    Verify whether an image matches a text description using CLIP embeddings.

    Parameters
    ----------
    image_input : PIL Image | bytes | str | np.ndarray
        The uploaded citizen image.
    text_description : str
        The citizen's text description of the issue.
    similarity_threshold : float
        Above this → MATCHED.
    suspicion_threshold : float
        Below this → SUSPICIOUS. Between thresholds → REVIEW.

    Returns
    -------
    CLIPMatchResult
    """
    result = CLIPMatchResult()

    img_emb = get_image_embedding(image_input)
    txt_emb = get_text_embedding(text_description)

    if img_emb is None or txt_emb is None:
        # CLIP not available — return neutral result, let other models decide
        result.model_available = False
        result.match_status = "REVIEW"
        result.is_match = None  # type: ignore
        result.confidence_score = 0.0
        return result

    result.model_available = True
    result.similarity_score = cosine_similarity(img_emb, txt_emb)

    # Determine match status
    if result.similarity_score >= similarity_threshold:
        result.match_status = "MATCHED"
        result.is_match = True
        result.confidence_score = result.similarity_score
    elif result.similarity_score >= suspicion_threshold:
        result.match_status = "SUSPICIOUS"
        result.is_match = None  # type: ignore
        result.confidence_score = result.similarity_score
    else:
        result.match_status = "MISMATCHED"
        result.is_match = False
        result.confidence_score = result.similarity_score

    return result
