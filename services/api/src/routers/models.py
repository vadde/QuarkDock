from __future__ import annotations

from collections.abc import AsyncIterator
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

from src.core.json import dumps_bytes
from src.models.chat import ModelDetail, ModelListResponse

router = APIRouter(prefix="/api/v1/models", tags=["Models"])


class PullModelRequest(BaseModel):
    name: str = Field(..., min_length=1, description="Model identifier to pull (e.g. llama3.2:3b)")


@router.get("", response_model=ModelListResponse, summary="List Available LLM Models")
async def list_models(request: Request) -> ModelListResponse:
    """Fetch loaded/cached model list from local Ollama engine."""
    ollama_client = getattr(request.app.state, "ollama", None)
    settings = getattr(request.app.state, "settings", None)
    default_model = settings.ollama_model if settings else "qwen2.5:7b"

    raw_models = await ollama_client.list_models() if ollama_client else []

    models = [
        ModelDetail(
            name=m.get("name", "unknown"),
            size=m.get("size", 0),
            modified_at=m.get("modified_at"),
            digest=m.get("digest"),
        )
        for m in raw_models
    ]

    return ModelListResponse(models=models, default_model=default_model)


@router.post("/pull", summary="Pull Model with Streaming SSE Progress")
async def pull_model(request: Request, payload: PullModelRequest):
    """Stream model download and verification progress via Server-Sent Events (SSE)."""
    ollama_client = getattr(request.app.state, "ollama", None)
    if not ollama_client:
        raise HTTPException(status_code=503, detail="Ollama client unavailable")

    async def sse_pull_generator() -> AsyncIterator[bytes]:
        async for progress in ollama_client.pull_model(payload.name):
            if await request.is_disconnected():
                break
            yield b"data: " + dumps_bytes(progress) + b"\n\n"
        yield b"data: [DONE]\n\n"

    return StreamingResponse(
        sse_pull_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.delete("/{model_name:path}", summary="Delete Model from Storage")
async def delete_model(request: Request, model_name: str) -> dict[str, Any]:
    """Remove a model from local Ollama disk storage."""
    ollama_client = getattr(request.app.state, "ollama", None)
    if not ollama_client:
        raise HTTPException(status_code=503, detail="Ollama client unavailable")

    success = await ollama_client.delete_model(model_name)
    if not success:
        raise HTTPException(status_code=400, detail=f"Failed to delete model {model_name}")

    return {"status": "success", "deleted": model_name}
