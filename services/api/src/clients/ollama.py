from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Any
import httpx
import orjson

from src.config import Settings


class OllamaClient:
    """High-efficiency connection-pooled async client for Ollama inference.

    Strictly complies with Rule 09:
    - Uses __slots__ for zero __dict__ overhead.
    - Uses a single shared persistent connection pool with HTTP/2.
    - Yields streaming chunks as an async generator with zero buffering.
    - Uses orjson for rapid JSON serialization.
    """

    __slots__ = ("_client", "_base_url", "_default_model")

    def __init__(self, settings: Settings) -> None:
        self._base_url = settings.ollama_base_url.rstrip("/")
        self._default_model = settings.ollama_model
        # Persistent connection pool with HTTP/2 and keep-alive
        self._client = httpx.AsyncClient(
            base_url=self._base_url,
            timeout=httpx.Timeout(
                connect=settings.ollama_connect_timeout,
                read=settings.ollama_read_timeout,
                write=10.0,
                pool=5.0,
            ),
            limits=httpx.Limits(
                max_connections=50,
                max_keepalive_connections=20,
                keepalive_expiry=60.0,
            ),
            http2=True,
        )

    @property
    def client(self) -> httpx.AsyncClient:
        """Expose shared persistent httpx.AsyncClient."""
        return self._client

    async def close(self) -> None:
        """Close connection pool cleanly."""
        await self._client.aclose()

    async def health(self) -> dict[str, Any]:
        """Check Ollama connectivity and return loaded version/status."""
        try:
            resp = await self._client.get("/api/version")
            if resp.status_code == 200:
                data = orjson.loads(resp.content)
                return {"status": "ok", "version": data.get("version", "unknown")}
            return {"status": "degraded", "code": resp.status_code}
        except Exception as e:
            return {"status": "unreachable", "error": str(e)}

    async def list_models(self) -> list[dict[str, Any]]:
        """Fetch list of cached models available in Ollama."""
        try:
            resp = await self._client.get("/api/tags")
            if resp.status_code == 200:
                data = orjson.loads(resp.content)
                return data.get("models", [])
            return []
        except Exception:
            return []

    async def stream_chat(
        self,
        messages: list[dict[str, str]],
        model: str | None = None,
        temperature: float = 0.7,
        top_p: float = 0.9,
    ) -> AsyncIterator[str]:
        """Stream chat completion chunks from Ollama via async generator.

        Rule 09 invariant: Zero-copy streaming, never buffers entire response.
        """
        target_model = model or self._default_model
        payload = {
            "model": target_model,
            "messages": messages,
            "stream": True,
            "options": {
                "temperature": temperature,
                "top_p": top_p,
            },
        }
        # Serialize via orjson bytes
        content_bytes = orjson.dumps(payload)

        async with self._client.stream(
            "POST",
            "/api/chat",
            content=content_bytes,
            headers={"Content-Type": "application/json"},
        ) as response:
            if response.status_code != 200:
                error_body = await response.aread()
                yield f"[Error: Ollama returned status {response.status_code}: {error_body.decode('utf-8', errors='ignore')}]"
                return

            # Line-by-line NDJSON parser
            async for line in response.aiter_lines():
                if not line:
                    continue
                try:
                    chunk_obj = orjson.loads(line)
                    delta = chunk_obj.get("message", {}).get("content", "")
                    if delta:
                        yield delta
                    if chunk_obj.get("done", False):
                        break
                except Exception:
                    continue

    async def pull_model(self, model_name: str) -> AsyncIterator[dict[str, Any]]:
        """Stream model pulling progress from Ollama via async generator."""
        payload = {"name": model_name, "stream": True}
        async with self._client.stream(
            "POST",
            "/api/pull",
            content=orjson.dumps(payload),
            headers={"Content-Type": "application/json"},
            timeout=httpx.Timeout(connect=10.0, read=1800.0, write=10.0, pool=5.0),
        ) as response:
            if response.status_code != 200:
                error_body = await response.aread()
                yield {"status": "error", "error": error_body.decode("utf-8", errors="ignore")}
                return

            async for line in response.aiter_lines():
                if not line:
                    continue
                try:
                    yield orjson.loads(line)
                except Exception:
                    continue

    async def delete_model(self, model_name: str) -> bool:
        """Delete a model from local Ollama storage."""
        try:
            req = self._client.build_request(
                "DELETE",
                "/api/delete",
                content=orjson.dumps({"name": model_name}),
                headers={"Content-Type": "application/json"},
            )
            resp = await self._client.send(req)
            return resp.status_code == 200
        except Exception:
            return False

