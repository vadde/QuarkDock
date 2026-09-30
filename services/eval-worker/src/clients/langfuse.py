"""High-efficiency async client for Langfuse Public REST API."""

from __future__ import annotations

import base64
import logging
from typing import Any

import httpx
import orjson

logger = logging.getLogger(__name__)


class LangfuseApiClient:
    """Async Langfuse API client using connection pooling and orjson."""

    __slots__ = ("_base_url", "_auth_header", "_client")

    def __init__(
        self,
        base_url: str,
        public_key: str,
        secret_key: str,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        auth_bytes = f"{public_key}:{secret_key}".encode()
        self._auth_header = f"Basic {base64.b64encode(auth_bytes).decode('ascii')}"
        self._client = client or httpx.AsyncClient(
            timeout=httpx.Timeout(15.0, connect=5.0),
            headers={
                "Authorization": self._auth_header,
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
        )

    async def get_traces(self, page: int = 1, limit: int = 20) -> list[dict[str, Any]]:
        """Fetch latest traces from Langfuse ordered by timestamp descending."""
        url = f"{self._base_url}/api/public/traces"
        params = {
            "page": page,
            "limit": limit,
            "orderBy": "timestamp",
            "order": "desc",
        }
        try:
            resp = await self._client.get(url, params=params)
            if resp.status_code != 200:
                logger.warning(
                    "Langfuse get_traces returned HTTP %d: %s",
                    resp.status_code,
                    resp.text[:200],
                )
                return []
            data = orjson.loads(resp.content)
            # Langfuse returns {"data": [...], "meta": {...}}
            if isinstance(data, dict) and "data" in data:
                return data["data"]
            if isinstance(data, list):
                return data
            return []
        except httpx.RequestError as exc:
            logger.warning("Failed to connect to Langfuse traces API: %s", exc)
            return []

    async def post_score(
        self,
        trace_id: str,
        name: str,
        value: float,
        comment: str = "",
    ) -> bool:
        """Submit a rubric evaluation score to Langfuse."""
        url = f"{self._base_url}/api/public/scores"
        payload = {
            "traceId": trace_id,
            "name": name,
            "value": value,
            "comment": comment[:1000] if comment else None,
        }
        try:
            resp = await self._client.post(url, content=orjson.dumps(payload))
            if resp.status_code in (200, 201):
                return True
            logger.warning(
                "Langfuse post_score failed with HTTP %d for trace %s: %s",
                resp.status_code,
                trace_id,
                resp.text[:200],
            )
            return False
        except httpx.RequestError as exc:
            logger.warning("Network error posting score for trace %s: %s", trace_id, exc)
            return False

    async def aclose(self) -> None:
        """Close internal HTTP client."""
        await self._client.aclose()
