from __future__ import annotations

from fastapi import APIRouter, Request
from src.models.chat import ModelDetail, ModelListResponse

router = APIRouter(prefix="/api/v1/models", tags=["Models"])


@router.get("", response_model=ModelListResponse, summary="List Available LLM Models")
async def list_models(request: Request) -> ModelListResponse:
    """Fetch loaded/cached model list from local Ollama container."""
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
