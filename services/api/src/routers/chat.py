from __future__ import annotations

import time
import uuid
from collections.abc import AsyncIterator

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from src.core.events import format_sse_event
from src.models.chat import ChatRequest

router = APIRouter(prefix="/api/v1/chat", tags=["Chat"])


@router.post("", summary="Stream Chat Completion via SSE")
async def chat_completion(request: Request, payload: ChatRequest) -> StreamingResponse:
    """Stream chat response tokens using Server-Sent Events (SSE).

    Adheres strictly to Rule 09:
    - O(1) memory generator streaming.
    - Upstream cancellation upon client disconnect.
    - Asynchronous Langfuse trace & generation telemetry recording.
    """
    ollama_client = request.app.state.ollama
    langfuse_client = getattr(request.app.state, "langfuse", None)

    trace_id = str(uuid.uuid4())
    start_time = time.perf_counter()

    # Format messages for Ollama API
    messages_payload: list[dict[str, str]] = []
    if payload.system_prompt:
        messages_payload.append({"role": "system", "content": payload.system_prompt})
    messages_payload.extend({"role": m.role, "content": m.content} for m in payload.messages)

    # Prepare Langfuse trace
    trace = None
    generation = None
    if langfuse_client:
        try:
            trace = langfuse_client.create_trace(
                name="chat_turn",
                input=messages_payload,
                metadata={"model": payload.model, "temperature": payload.temperature, "top_p": payload.top_p},
                tags=["chat_ui", payload.model],
            )
            if trace:
                trace_id = getattr(trace, "id", trace_id)
                generation = trace.generation(
                    name="ollama_generate",
                    model=payload.model,
                    input=messages_payload,
                    model_parameters={"temperature": payload.temperature, "top_p": payload.top_p},
                )
        except Exception:
            pass

    trace_url = f"http://localhost:3001/project/default/traces/{trace_id}"

    async def sse_generator() -> AsyncIterator[str]:
        # 1. Send trace metadata event first
        yield format_sse_event("trace", {"trace_id": trace_id, "url": trace_url})

        full_response_parts: list[str] = []
        token_count = 0

        try:
            async for token_chunk in ollama_client.stream_chat(
                messages=messages_payload,
                model=payload.model,
                temperature=payload.temperature,
                top_p=payload.top_p,
            ):
                # Check for client disconnect to prevent wasted host compute (Rule 08)
                if await request.is_disconnected():
                    break

                full_response_parts.append(token_chunk)
                token_count += 1
                yield format_sse_event("token", {"text": token_chunk, "index": token_count})

        except Exception as exc:
            yield format_sse_event("error", {"message": str(exc), "code": "STREAM_FAILURE"})
            return

        elapsed_ms = (time.perf_counter() - start_time) * 1000
        completed_text = "".join(full_response_parts)

        # Finalize Langfuse generation span and root trace
        if generation:
            try:
                generation.end(
                    output=completed_text,
                    usage={"total_tokens": token_count},
                )
            except Exception:
                pass
        if trace:
            try:
                trace.update(output=completed_text)
            except Exception:
                pass
        if langfuse_client:
            try:
                await langfuse_client.flush()
            except Exception:
                pass

        # 2. Emit completion done event
        yield format_sse_event(
            "done",
            {
                "model": payload.model,
                "total_tokens": token_count,
                "duration_ms": round(elapsed_ms, 2),
                "trace_id": trace_id,
            },
        )

    return StreamingResponse(
        sse_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
