from __future__ import annotations

import time
import uuid
from collections.abc import AsyncIterator
from typing import Any

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

from src.core.json import dumps_bytes

router = APIRouter(prefix="/v1", tags=["OpenAI Compatible Gateway"])


class OpenAIMessage(BaseModel):
    role: str
    content: str
    name: str | None = None


class OpenAIChatRequest(BaseModel):
    model: str = Field(default="qwen2.5:7b", description="Model identifier")
    messages: list[OpenAIMessage] = Field(..., min_length=1, description="Messages array")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    top_p: float = Field(default=0.9, ge=0.0, le=1.0)
    stream: bool = Field(default=False)
    max_tokens: int | None = Field(default=None)


@router.get("/models", summary="OpenAI-Compatible Model List")
async def list_models(request: Request) -> dict[str, Any]:
    """Expose available models in OpenAI standard format for OpenClaw Desktop."""
    ollama_client = getattr(request.app.state, "ollama", None)
    raw_models = await ollama_client.list_models() if ollama_client else []

    data = [
        {
            "id": m.get("name", "unknown"),
            "object": "model",
            "created": int(time.time()),
            "owned_by": "quarkdock-ollama",
            "permission": [],
            "root": m.get("name", "unknown"),
            "parent": None,
        }
        for m in raw_models
    ]

    if not data:
        data.append(
            {
                "id": "qwen2.5:7b",
                "object": "model",
                "created": int(time.time()),
                "owned_by": "quarkdock-ollama",
            }
        )

    return {"object": "list", "data": data}


@router.post("/chat/completions", summary="OpenAI-Compatible Chat Completions with Langfuse Tracing")
async def chat_completions(request: Request, payload: OpenAIChatRequest):
    """OpenAI-compatible chat completion gateway.

    Intercepts OpenClaw Desktop / host client requests and automatically generates
    deep Langfuse spans with token usage, duration, and latency.
    """
    ollama_client = request.app.state.ollama
    langfuse_client = getattr(request.app.state, "langfuse", None)

    completion_id = f"chatcmpl-{uuid.uuid4().hex[:12]}"
    created_ts = int(time.time())
    start_time = time.perf_counter()

    messages_payload = [{"role": m.role, "content": m.content} for m in payload.messages]

    # Initialize Langfuse trace
    trace = None
    generation = None
    if langfuse_client:
        try:
            trace = langfuse_client.create_trace(
                name="openclaw_chat_completion",
                input=messages_payload,
                metadata={
                    "source": "openclaw_desktop",
                    "client": "openai_v1_gateway",
                    "model": payload.model,
                },
                tags=["openclaw", "openai-v1", payload.model],
            )
            if trace:
                generation = trace.generation(
                    name="ollama_chat",
                    model=payload.model,
                    input=messages_payload,
                    model_parameters={
                        "temperature": payload.temperature,
                        "top_p": payload.top_p,
                    },
                )
        except Exception:
            pass

    # 1. Non-streaming completion
    if not payload.stream:
        full_content: list[str] = []
        token_count = 0

        async for chunk in ollama_client.stream_chat(
            messages=messages_payload,
            model=payload.model,
            temperature=payload.temperature,
            top_p=payload.top_p,
        ):
            full_content.append(chunk)
            token_count += 1

        result_text = "".join(full_content)
        duration_ms = (time.perf_counter() - start_time) * 1000

        if generation:
            try:
                generation.end(
                    output=result_text,
                    usage={"total_tokens": token_count},
                    metadata={"duration_ms": duration_ms},
                )
            except Exception:
                pass
        if trace:
            try:
                trace.update(output=result_text)
            except Exception:
                pass
        if langfuse_client:
            try:
                await langfuse_client.flush()
            except Exception:
                pass

        return JSONResponse(
            content={
                "id": completion_id,
                "object": "chat.completion",
                "created": created_ts,
                "model": payload.model,
                "choices": [
                    {
                        "index": 0,
                        "message": {"role": "assistant", "content": result_text},
                        "finish_reason": "stop",
                    }
                ],
                "usage": {
                    "prompt_tokens": len(str(messages_payload).split()),
                    "completion_tokens": token_count,
                    "total_tokens": len(str(messages_payload).split()) + token_count,
                },
            }
        )

    # 2. Streaming completion (SSE)
    async def openai_sse_generator() -> AsyncIterator[bytes]:
        token_count = 0
        full_response_parts: list[str] = []

        try:
            # Initial chunk with role
            first_chunk = {
                "id": completion_id,
                "object": "chat.completion.chunk",
                "created": created_ts,
                "model": payload.model,
                "choices": [
                    {
                        "index": 0,
                        "delta": {"role": "assistant", "content": ""},
                        "finish_reason": None,
                    }
                ],
            }
            yield b"data: " + dumps_bytes(first_chunk) + b"\n\n"

            async for token_chunk in ollama_client.stream_chat(
                messages=messages_payload,
                model=payload.model,
                temperature=payload.temperature,
                top_p=payload.top_p,
            ):
                if await request.is_disconnected():
                    break

                token_count += 1
                full_response_parts.append(token_chunk)

                stream_chunk = {
                    "id": completion_id,
                    "object": "chat.completion.chunk",
                    "created": created_ts,
                    "model": payload.model,
                    "choices": [
                        {
                            "index": 0,
                            "delta": {"content": token_chunk},
                            "finish_reason": None,
                        }
                    ],
                }
                yield b"data: " + dumps_bytes(stream_chunk) + b"\n\n"

            # Final stop chunk
            stop_chunk = {
                "id": completion_id,
                "object": "chat.completion.chunk",
                "created": created_ts,
                "model": payload.model,
                "choices": [{"index": 0, "delta": {}, "finish_reason": "stop"}],
            }
            yield b"data: " + dumps_bytes(stop_chunk) + b"\n\n"
            yield b"data: [DONE]\n\n"

        finally:
            duration_ms = (time.perf_counter() - start_time) * 1000
            completed_text = "".join(full_response_parts)
            if generation:
                try:
                    generation.end(
                        output=completed_text,
                        usage={"total_tokens": token_count},
                        metadata={"duration_ms": duration_ms},
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

    return StreamingResponse(
        openai_sse_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
