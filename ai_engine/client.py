"""
CivicShield AI Client
Python client for the CivicShield AI verification microservice.
"""

from __future__ import annotations

import asyncio
import aiohttp
import requests
from typing import Optional
from dataclasses import dataclass


@dataclass
class VerificationResponse:
    """Parsed response from the AI verification endpoint."""
    is_match: bool | None
    match_status: str
    similarity_score: float
    decision_action: str
    predicted_category: str
    predicted_severity: str
    is_anomaly: bool
    is_fraud_or_spam: bool
    anomaly_flags: list[str]
    yolo_detections: list[dict]
    processing_time_ms: int
    models_used: list[str]
    raw: dict

    @classmethod
    def from_dict(cls, data: dict) -> VerificationResponse:
        v = data.get("verification", {})
        ml = data.get("ml_predictions", {})
        anom = data.get("anomaly_detection", {})

        return cls(
            is_match=v.get("is_match"),
            match_status=v.get("match_status", "REVIEW"),
            similarity_score=v.get("similarity_score", 0.0),
            decision_action=data.get("decision_action", "REVIEW"),
            predicted_category=ml.get("predicted_category", "PUBLIC_INFRA_DAMAGE"),
            predicted_severity=ml.get("predicted_severity", "MEDIUM"),
            is_anomaly=v.get("is_anomaly", False),
            is_fraud_or_spam=anom.get("is_fraud_or_spam", False),
            anomaly_flags=anom.get("flags", []),
            yolo_detections=data.get("yolo_detections", []),
            processing_time_ms=data.get("processing_time_ms", 0),
            models_used=data.get("models_used", []),
            raw=data,
        )

    @property
    def is_approved(self) -> bool:
        return self.decision_action == "APPROVE_FOR_ROUTING"

    @property
    def is_rejected(self) -> bool:
        return self.decision_action == "REJECT"

    @property
    def needs_review(self) -> bool:
        return self.decision_action in ("PENDING_MODERATION", "FLAGGED_ANOMALY", "FLAGGED_MISMATCH")


class CivicShieldAIClient:
    """
    Async client for the CivicShield AI verification microservice.
    """

    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url.rstrip("/")
        self._session: Optional[aiohttp.ClientSession] = None

    async def _get_session(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession()
        return self._session

    async def close(self):
        if self._session and not self._session.closed:
            await self._session.close()

    async def verify_incident(
        self,
        image_bytes: bytes,
        description: str,
        claimed_category: str = "",
        filename: str = "upload.jpg",
        content_type: str = "image/jpeg",
    ) -> VerificationResponse:
        """
        Send an image + description to the AI pipeline for verification.

        Parameters
        ----------
        image_bytes : bytes
            Raw image data.
        description : str
            Citizen's text description.
        claimed_category : str
            Category selected by citizen.
        filename : str
            Filename for the multipart upload.
        content_type : str
            MIME type of the image.

        Returns
        -------
        VerificationResponse
        """
        session = await self._get_session()
        url = f"{self.base_url}/api/v1/verify-incident-image"

        data = aiohttp.FormData()
        data.add_field("image", image_bytes, filename=filename, content_type=content_type)
        data.add_field("description", description)
        data.add_field("claimed_category", claimed_category)

        async with session.post(url, data=data) as resp:
            if resp.status != 200:
                error_text = await resp.text()
                raise RuntimeError(f"AI service error {resp.status}: {error_text}")

            json_data = await resp.json()
            return VerificationResponse.from_dict(json_data)

    async def health_check(self) -> dict:
        """Check if the AI service is running and healthy."""
        session = await self._get_session()
        async with session.get(f"{self.base_url}/health") as resp:
            return await resp.json()


# ── Synchronous wrapper ────────────────────────────────────────────────────────
class SyncCivicShieldAIClient:
    """
    Synchronous client for use in non-async contexts (scripts, tests).
    """

    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url.rstrip("/")

    def verify_incident(
        self,
        image_path: str,
        description: str,
        claimed_category: str = "",
    ) -> VerificationResponse:
        """
        Send an image file + description to the AI pipeline.

        Parameters
        ----------
        image_path : str
            Path to the image file.
        description : str
            Citizen's text description.
        claimed_category : str
            Category selected by citizen.

        Returns
        -------
        VerificationResponse
        """
        url = f"{self.base_url}/api/v1/verify-incident-image"

        with open(image_path, "rb") as f:
            image_bytes = f.read()

        files = {"image": (image_path, image_bytes, "image/jpeg")}
        data = {
            "description": description,
            "claimed_category": claimed_category,
        }

        resp = requests.post(url, files=files, data=data, timeout=120)

        if resp.status_code != 200:
            raise RuntimeError(f"AI service error {resp.status}: {resp.text}")

        return VerificationResponse.from_dict(resp.json())

    def health_check(self) -> dict:
        """Check if the AI service is running."""
        return requests.get(f"{self.base_url}/health", timeout=5).json()
