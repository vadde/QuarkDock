from __future__ import annotations

import time
from typing import Any

from fastapi import APIRouter, Request

router = APIRouter(tags=["Health & Diagnostics"])

_START_TIME = time.time()


@router.get("/health", summary="Readiness & Liveness Probe")
async def health_check(request: Request) -> dict[str, Any]:
    """Inspect downstream services (Ollama, Redis, Langfuse) and return ecosystem health."""
    ollama_client = getattr(request.app.state, "ollama", None)
    redis_client = getattr(request.app.state, "redis", None)
    langfuse_client = getattr(request.app.state, "langfuse", None)

    ollama_status = await ollama_client.health() if ollama_client else {"status": "uninitialized"}
    redis_status = await redis_client.health() if redis_client else {"status": "uninitialized"}
    langfuse_status = await langfuse_client.health() if langfuse_client else {"status": "uninitialized"}

    is_ready = ollama_status.get("status") == "ok"

    settings = getattr(request.app.state, "settings", None)
    client_eval_enabled = settings.enable_client_eval if settings else False

    return {
        "status": "ok" if is_ready else "degraded",
        "uptime_seconds": int(time.time() - _START_TIME),
        "version": getattr(request.app.state, "version", "0.1.0"),
        "features": {
            "client_eval_enabled": client_eval_enabled,
        },
        "components": {
            "ollama": ollama_status,
            "redis": redis_status,
            "langfuse": langfuse_status,
        },
    }
