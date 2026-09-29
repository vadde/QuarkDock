from __future__ import annotations

import logging
from typing import Any
from src.config import Settings

logger = logging.getLogger(__name__)


class LangfuseManager:
    """Fail-open wrapper for Langfuse v3 observability (Rule 04 & 09 compliant).

    Guarantees:
    - Zero interference with LLM inference stream if Langfuse is offline.
    - Captures generation spans, latency, and prompt/response token metrics.
    """

    __slots__ = ("_client", "_enabled", "_host", "_public_key")

    def __init__(self, settings: Settings) -> None:
        self._enabled = settings.langfuse_enabled
        self._host = settings.langfuse_host
        self._public_key = settings.langfuse_public_key
        self._client: Any = None

        if self._enabled and settings.langfuse_public_key and settings.langfuse_secret_key:
            try:
                from langfuse import Langfuse

                self._client = Langfuse(
                    public_key=settings.langfuse_public_key,
                    secret_key=settings.langfuse_secret_key,
                    host=settings.langfuse_host,
                    flush_interval=1.0,
                    timeout=5,
                )
                logger.info("Langfuse tracing initialized: host=%s", settings.langfuse_host)
            except Exception as e:
                logger.warning("Langfuse initialization failed; failing open: %s", e)
                self._client = None
        else:
            logger.info("Langfuse tracing is disabled or unconfigured.")

    async def flush(self) -> None:
        """Flush pending observability spans."""
        if self._client:
            try:
                self._client.flush()
            except Exception as e:
                logger.warning("Langfuse flush error: %s", e)

    async def shutdown(self) -> None:
        """Flush and safely close Langfuse background threads."""
        if self._client:
            try:
                self._client.shutdown()
            except Exception as e:
                logger.warning("Langfuse shutdown error: %s", e)

    def create_trace(
        self,
        name: str = "chat_generation",
        user_id: str | None = None,
        session_id: str | None = None,
        metadata: dict[str, Any] | None = None,
        tags: list[str] | None = None,
        **kwargs: Any,
    ) -> Any:
        """Create a new root trace for a chat conversation."""
        if not self._client:
            return None
        try:
            return self._client.trace(
                name=name,
                user_id=user_id,
                session_id=session_id,
                metadata=metadata or {},
                tags=tags or [],
                **kwargs,
            )
        except Exception as e:
            logger.warning("Failed to create Langfuse trace: %s", e)
            return None

    def create_score(
        self,
        trace_id: str,
        name: str,
        value: float,
        comment: str | None = None,
    ) -> bool:
        """Record user feedback or automated judge score against a trace."""
        if not self._client:
            return False
        try:
            self._client.score(
                trace_id=trace_id,
                name=name,
                value=value,
                comment=comment,
            )
            return True
        except Exception as e:
            logger.warning("Failed to record Langfuse score: %s", e)
            return False

    async def health(self) -> dict[str, Any]:
        """Check Langfuse connectivity status."""
        if not self._enabled:
            return {"status": "disabled"}
        if not self._client:
            return {"status": "uninitialized"}
        try:
            healthy = self._client.auth_check()
            return {"status": "ok" if healthy else "auth_failed", "host": self._host}
        except Exception as e:
            return {"status": "unreachable", "error": str(e), "host": self._host}
