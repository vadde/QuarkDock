from __future__ import annotations

import logging
import time
from collections.abc import AsyncIterator
from typing import Any

import httpx
import orjson
from fastapi import APIRouter, Request, Response
from fastapi.responses import JSONResponse, StreamingResponse

logger = logging.getLogger("quarkdock.api.ollama_wire")

router = APIRouter(prefix="/api", tags=["Ollama Native Wire Proxy"])


@router.get("/tags", summary="Ollama Native Model Tags List")
async def list_tags(request: Request) -> dict[str, Any]:
    """Expose available models matching Ollama native /api/tags wire format."""
    ollama_client = getattr(request.app.state, "ollama", None)
    raw_models = await ollama_client.list_models() if ollama_client else []
    return {"models": raw_models}


@router.get("/version", summary="Ollama Native Version")
async def get_version(request: Request) -> dict[str, Any]:
    """Expose version matching Ollama native /api/version wire format."""
    ollama_client = getattr(request.app.state, "ollama", None)
    health_info = await ollama_client.health() if ollama_client else {}
    return {"version": health_info.get("version", "0.5.11")}


@router.post("/show", summary="Ollama Native Model Show Info")
async def show_model(request: Request) -> Response:
    """Proxy model inspection matching Ollama native /api/show wire format."""
    ollama_client = getattr(request.app.state, "ollama", None)
    if not ollama_client:
        return Response(
            content=b'{"error": "Ollama service unavailable"}',
            status_code=503,
            media_type="application/json",
        )
    body = await request.body()
    try:
        resp = await ollama_client.client.post(
            "/api/show",
            content=body,
            headers={"Content-Type": "application/json"},
            timeout=httpx.Timeout(connect=5.0, read=30.0, write=10.0, pool=5.0),
        )
        return Response(
            content=resp.content,
            status_code=resp.status_code,
            media_type="application/json",
        )
    except Exception as exc:
        logger.error("Failed to proxy /api/show to Ollama: %s", exc)
        return Response(
            content=orjson.dumps({"error": str(exc)}),
            status_code=502,
            media_type="application/json",
        )


@router.post("/chat", summary="Ollama Native Chat with Langfuse Telemetry")
async def chat(request: Request):
    """Intercept Ollama wire-format chat completions.
    
    Streams responses directly from host Ollama with zero buffering and logs
    deep telemetry traces (tokens, latency, prompt, output) into Langfuse under
    the QuarkDock project.
    """
    ollama_client = getattr(request.app.state, "ollama", None)
    langfuse_client = getattr(request.app.state, "langfuse", None)

    if not ollama_client:
        return JSONResponse(
            content={"error": "Ollama service unavailable"},
            status_code=503,
        )

    raw_body = await request.body()
    try:
        payload = orjson.loads(raw_body)
    except Exception:
        payload = {}

    model = payload.get("model", "qwen2.5:7b")
    stream = payload.get("stream", True)
    messages = payload.get("messages", [])
    options = payload.get("options", {})
    tools = payload.get("tools")

    # Rule 04 & 08: Fail-open Langfuse trace initialization
    trace = None
    generation = None
    if langfuse_client:
        try:
            trace = langfuse_client.create_trace(
                name="openclaw_ollama_chat",
                input=messages,
                metadata={
                    "source": "openclaw",
                    "runtime": "ollama_wire",
                    "model": model,
                    "stream": stream,
                    "has_tools": bool(tools),
                },
                tags=["openclaw", "ollama-wire", model],
            )
            if trace:
                generation = trace.generation(
                    name="ollama_chat",
                    model=model,
                    input=messages,
                    model_parameters=options,
                )
        except Exception as exc:
            logger.warning("Langfuse trace initialization failed (fail-open): %s", exc)

    # 1. Non-streaming execution
    if not stream:
        start_time = time.perf_counter()
        try:
            resp = await ollama_client.client.post(
                "/api/chat",
                content=raw_body,
                headers={"Content-Type": "application/json"},
                timeout=httpx.Timeout(connect=10.0, read=300.0, write=10.0, pool=5.0),
            )
        except Exception as exc:
            logger.error("Failed to forward non-streaming chat to Ollama: %s", exc)
            return JSONResponse(
                content={"error": str(exc)},
                status_code=502,
            )

        duration_ms = (time.perf_counter() - start_time) * 1000
        if resp.status_code == 200:
            try:
                data = orjson.loads(resp.content)
                msg = data.get("message", {})
                out_content = msg.get("content", "")
                prompt_eval_count = data.get("prompt_eval_count", 0)
                eval_count = data.get("eval_count", 0)

                if generation:
                    try:
                        generation.end(
                            output=msg,
                            usage={
                                "prompt_tokens": prompt_eval_count,
                                "completion_tokens": eval_count,
                                "total_tokens": prompt_eval_count + eval_count,
                            },
                            metadata={"duration_ms": duration_ms},
                        )
                    except Exception:
                        pass
                if trace:
                    try:
                        trace.update(output=out_content)
                    except Exception:
                        pass
                if langfuse_client:
                    try:
                        await langfuse_client.flush()
                    except Exception:
                        pass
            except Exception:
                pass

        return Response(
            content=resp.content,
            status_code=resp.status_code,
            media_type="application/json",
        )

    # 2. Streaming execution (NDJSON line-by-line streaming)
    async def ndjson_generator() -> AsyncIterator[bytes]:
        start_time = time.perf_counter()
        token_count = 0
        full_response_parts: list[str] = []
        final_chunk_metrics: dict[str, Any] = {}

        try:
            async with ollama_client.client.stream(
                "POST",
                "/api/chat",
                content=raw_body,
                headers={"Content-Type": "application/json"},
                timeout=httpx.Timeout(connect=10.0, read=1800.0, write=10.0, pool=5.0),
            ) as upstream_resp:
                if upstream_resp.status_code != 200:
                    err_body = await upstream_resp.aread()
                    yield err_body
                    return

                async for line in upstream_resp.aiter_lines():
                    # Check if client disconnected to abort compute
                    if await request.is_disconnected():
                        break
                    if not line:
                        continue

                    # Yield NDJSON chunk with newline
                    yield line.encode("utf-8") + b"\n"

                    try:
                        chunk = orjson.loads(line)
                        delta = chunk.get("message", {}).get("content", "")
                        if delta:
                            full_response_parts.append(delta)
                            token_count += 1
                        if chunk.get("done", False):
                            final_chunk_metrics = chunk
                            break
                    except Exception:
                        continue
        except Exception as exc:
            logger.error("Error during Ollama NDJSON streaming: %s", exc)
            yield orjson.dumps({"error": str(exc), "done": True}) + b"\n"
            return
        finally:
            duration_ms = (time.perf_counter() - start_time) * 1000
            prompt_eval_count = final_chunk_metrics.get("prompt_eval_count", 0)
            eval_count = final_chunk_metrics.get("eval_count", token_count)
            result_text = "".join(full_response_parts)

            if generation:
                try:
                    generation.end(
                        output={"role": "assistant", "content": result_text},
                        usage={
                            "prompt_tokens": prompt_eval_count,
                            "completion_tokens": eval_count,
                            "total_tokens": prompt_eval_count + eval_count,
                        },
                        metadata={
                            "duration_ms": duration_ms,
                            "total_duration_ns": final_chunk_metrics.get("total_duration", 0),
                            "eval_duration_ns": final_chunk_metrics.get("eval_duration", 0),
                        },
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

    return StreamingResponse(ndjson_generator(), media_type="application/x-ndjson")
