"""Trace evaluation orchestrator and adjudication coordinator."""

from __future__ import annotations

import logging
from typing import Any

from src.clients.langfuse import LangfuseApiClient
from src.clients.ollama import OllamaJudgeClient
from src.db import EvalStateManager
from src.rubrics import ACTIVE_RUBRICS, Rubric

logger = logging.getLogger(__name__)


def extract_query_and_response(trace: dict[str, Any]) -> tuple[str | None, str | None]:
    """Extract clean user query and assistant response from varied Langfuse trace formats."""
    raw_input = trace.get("input")
    raw_output = trace.get("output")

    query: str | None = None
    if isinstance(raw_input, str):
        query = raw_input.strip()
    elif isinstance(raw_input, dict):
        if "query" in raw_input and isinstance(raw_input["query"], str):
            query = raw_input["query"]
        elif "prompt" in raw_input and isinstance(raw_input["prompt"], str):
            query = raw_input["prompt"]
        elif "messages" in raw_input and isinstance(raw_input["messages"], list):
            # Extract last user message
            for msg in reversed(raw_input["messages"]):
                if isinstance(msg, dict) and msg.get("role") == "user":
                    query = str(msg.get("content", ""))
                    break
    elif isinstance(raw_input, list):
        for msg in reversed(raw_input):
            if isinstance(msg, dict) and msg.get("role") == "user":
                query = str(msg.get("content", ""))
                break

    response: str | None = None
    if isinstance(raw_output, str):
        response = raw_output.strip()
    elif isinstance(raw_output, dict):
        if "text" in raw_output and isinstance(raw_output["text"], str):
            response = raw_output["text"]
        elif "content" in raw_output and isinstance(raw_output["content"], str):
            response = raw_output["content"]
        elif "response" in raw_output and isinstance(raw_output["response"], str):
            response = raw_output["response"]

    return query, response


class TraceEvaluator:
    """Coordinates batch trace fetching, deduplication, judge evaluation, and score persistence."""

    __slots__ = ("_langfuse", "_ollama", "_state_mgr", "_rubrics")

    def __init__(
        self,
        langfuse_client: LangfuseApiClient,
        ollama_client: OllamaJudgeClient,
        state_mgr: EvalStateManager,
        rubrics: tuple[Rubric, ...] = ACTIVE_RUBRICS,
    ) -> None:
        self._langfuse = langfuse_client
        self._ollama = ollama_client
        self._state_mgr = state_mgr
        self._rubrics = rubrics

    async def evaluate_trace(self, trace: dict[str, Any]) -> int:
        """Evaluate a single trace against all missing rubrics. Returns count of scores posted."""
        trace_id = trace.get("id")
        if not trace_id:
            return 0

        query, response = extract_query_and_response(trace)
        if not query or not response:
            return 0

        # Existing scores in Langfuse
        existing_langfuse_scores: set[str] = set()
        for score_obj in trace.get("scores", []) or []:
            if isinstance(score_obj, dict) and "name" in score_obj:
                existing_langfuse_scores.add(score_obj["name"])

        # Completed rubrics in local SQLite state
        recorded_rubrics = self._state_mgr.get_evaluated_rubrics(trace_id)

        scores_posted = 0
        for rubric in self._rubrics:
            score_name = f"judge_{rubric.name}"
            # Skip if already evaluated either in Langfuse or in local DB
            if score_name in existing_langfuse_scores or rubric.name in recorded_rubrics:
                continue

            logger.info("Adjudicating trace %s on rubric: %s", trace_id[:8], rubric.name)
            raw_score, rationale = await self._ollama.evaluate_rubric(
                query=query,
                response=response,
                rubric_template=rubric.prompt_template,
            )

            # Normalize to 0.0 - 1.0
            normalized_val = round(raw_score / 5.0, 2)
            comment = f"Score: {raw_score}/5. {rationale}"

            # Post to Langfuse
            posted = await self._langfuse.post_score(
                trace_id=trace_id,
                name=score_name,
                value=normalized_val,
                comment=comment,
            )

            if posted:
                self._state_mgr.record_evaluation(
                    trace_id=trace_id,
                    rubric=rubric.name,
                    score=normalized_val,
                    comment=comment,
                )
                scores_posted += 1
                logger.info(
                    "Recorded score for trace %s: %s=%.2f (%d/5)",
                    trace_id[:8],
                    score_name,
                    normalized_val,
                    raw_score,
                )

        return scores_posted

    async def run_evaluation_cycle(self, limit: int = 10) -> int:
        """Fetch latest traces and evaluate unscored interactions."""
        traces = await self._langfuse.get_traces(page=1, limit=limit)
        if not traces:
            return 0

        total_posted = 0
        for trace in traces:
            posted = await self.evaluate_trace(trace)
            total_posted += posted

        return total_posted
