from __future__ import annotations

from typing import Any
from fastapi import APIRouter, HTTPException, Request
from src.models.chat import FeedbackRequest

router = APIRouter(prefix="/api/v1/feedback", tags=["Observability & Feedback"])


@router.post("", summary="Record User Feedback Score on Langfuse Trace")
async def record_feedback(feedback: FeedbackRequest, request: Request) -> dict[str, Any]:
    """Attach thumbs up (+1) or thumbs down (-1) score to a Langfuse generation trace."""
    langfuse_client = getattr(request.app.state, "langfuse", None)
    if not langfuse_client:
        raise HTTPException(status_code=503, detail="Observability service unavailable")

    success = langfuse_client.create_score(
        trace_id=feedback.trace_id,
        name=feedback.name,
        value=feedback.value,
        comment=feedback.comment,
    )

    if not success:
        return {"status": "accepted_locally", "trace_id": feedback.trace_id}

    return {"status": "recorded", "trace_id": feedback.trace_id, "score": feedback.value}
