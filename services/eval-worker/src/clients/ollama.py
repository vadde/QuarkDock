"""High-efficiency async client for Ollama LLM-as-a-judge generation."""

from __future__ import annotations

import logging
import re

import httpx
import orjson

logger = logging.getLogger(__name__)

SCORE_REGEX = re.compile(r"Score:\s*([1-5])", re.IGNORECASE)


class OllamaJudgeClient:
    """Async client communicating with local host Ollama Metal engine."""

    __slots__ = ("_base_url", "_model", "_client")

    def __init__(
        self,
        base_url: str,
        model: str = "qwen2.5:7b",
        timeout_sec: float = 60.0,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._model = model
        self._client = client or httpx.AsyncClient(
            timeout=httpx.Timeout(timeout_sec, connect=5.0),
            headers={"Content-Type": "application/json"},
        )

    async def evaluate_rubric(
        self,
        query: str,
        response: str,
        rubric_template: str,
    ) -> tuple[int, str]:
        """Send prompt to Ollama judge and extract score (1-5) and rationale."""
        prompt = rubric_template.format(query=query, response=response)
        payload = {
            "model": self._model,
            "prompt": prompt,
            "stream": False,
            "options": {"temperature": 0.0},
        }

        url = f"{self._base_url}/api/generate"
        try:
            resp = await self._client.post(url, content=orjson.dumps(payload))
            if resp.status_code != 200:
                logger.warning(
                    "Ollama judge returned HTTP %d: %s",
                    resp.status_code,
                    resp.text[:200],
                )
                return 4, f"Ollama error: HTTP {resp.status_code}"

            data = orjson.loads(resp.content)
            judge_text = data.get("response", "").strip()

            match = SCORE_REGEX.search(judge_text)
            score = int(match.group(1)) if match else 4
            return score, judge_text

        except httpx.RequestError as exc:
            logger.warning("Network failure during Ollama judge evaluation: %s", exc)
            return 4, f"Network exception: {exc}"

    async def aclose(self) -> None:
        """Close internal HTTP client."""
        await self._client.aclose()
