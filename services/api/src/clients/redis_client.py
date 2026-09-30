from __future__ import annotations

import logging
from typing import Any

import redis.asyncio as aioredis

from src.config import Settings

logger = logging.getLogger(__name__)


class RedisManager:
    """Connection-pooled Redis client with graceful degradation (Rule 09 compliant)."""

    __slots__ = ("_client", "_enabled")

    def __init__(self, settings: Settings) -> None:
        self._enabled = bool(settings.redis_url)
        if self._enabled:
            self._client = aioredis.from_url(
                settings.redis_url,
                max_connections=settings.redis_pool_size,
                decode_responses=True,
                socket_timeout=3.0,
                socket_connect_timeout=3.0,
            )
        else:
            self._client = None

    async def close(self) -> None:
        """Close connection pool."""
        if self._client:
            await self._client.aclose()

    async def health(self) -> dict[str, Any]:
        """Check Redis connectivity."""
        if not self._client:
            return {"status": "disabled"}
        try:
            pong = await self._client.ping()
            return {"status": "ok" if pong else "degraded"}
        except Exception as e:
            return {"status": "unreachable", "error": str(e)}

    async def get(self, key: str) -> str | None:
        """Get string value by key."""
        if not self._client:
            return None
        try:
            return await self._client.get(key)
        except Exception as e:
            logger.warning("Redis get failure for key %s: %s", key, e)
            return None

    async def setex(self, key: str, seconds: int, value: str) -> bool:
        """Set key with TTL."""
        if not self._client:
            return False
        try:
            await self._client.setex(key, seconds, value)
            return True
        except Exception as e:
            logger.warning("Redis setex failure for key %s: %s", key, e)
            return False
