"""Unit tests for trace extraction and evaluation orchestrator."""

from pathlib import Path
from unittest.mock import AsyncMock

import pytest

from src.clients.langfuse import LangfuseApiClient
from src.clients.ollama import OllamaJudgeClient
from src.db import EvalStateManager
from src.evaluator import TraceEvaluator, extract_query_and_response
from src.rubrics import ACTIVE_RUBRICS


def test_extract_query_and_response_variants():
    # String input / output
    t1 = {"input": "What is Python?", "output": "Python is a language."}
    q1, r1 = extract_query_and_response(t1)
    assert q1 == "What is Python?"
    assert r1 == "Python is a language."

    # OpenAI-style message dict
    t2 = {
        "input": {
            "messages": [
                {"role": "system", "content": "You are helpful"},
                {"role": "user", "content": "How far is Mars?"},
            ]
        },
        "output": {"content": "About 140 million miles."},
    }
    q2, r2 = extract_query_and_response(t2)
    assert q2 == "How far is Mars?"
    assert r2 == "About 140 million miles."

    # List of messages
    t3 = {
        "input": [{"role": "user", "content": "List 3 colors"}],
        "output": {"text": "Red, Blue, Green"},
    }
    q3, r3 = extract_query_and_response(t3)
    assert q3 == "List 3 colors"
    assert r3 == "Red, Blue, Green"

    # Empty / malformed
    t4 = {"input": None, "output": None}
    q4, r4 = extract_query_and_response(t4)
    assert q4 is None
    assert r4 is None


@pytest.mark.asyncio
async def test_trace_evaluator_flow(temp_db_path: Path):
    state_mgr = EvalStateManager(temp_db_path)

    mock_langfuse = AsyncMock(spec=LangfuseApiClient)
    mock_langfuse.post_score.return_value = True

    mock_ollama = AsyncMock(spec=OllamaJudgeClient)
    mock_ollama.evaluate_rubric.return_value = (5, "Air tight logic.")

    evaluator = TraceEvaluator(
        langfuse_client=mock_langfuse,
        ollama_client=mock_ollama,
        state_mgr=state_mgr,
        rubrics=ACTIVE_RUBRICS,
    )

    trace = {
        "id": "trace-xyz",
        "input": "Explain recursion.",
        "output": "Recursion is a function calling itself.",
        "scores": [],
    }

    posted_count = await evaluator.evaluate_trace(trace)
    assert posted_count == 3  # correctness, conciseness, helpfulness
    assert mock_ollama.evaluate_rubric.call_count == 3
    assert mock_langfuse.post_score.call_count == 3
    assert state_mgr.get_total_evaluations() == 3

    # Running again on same trace must evaluate 0 rubrics (idempotent)
    mock_ollama.evaluate_rubric.reset_mock()
    mock_langfuse.post_score.reset_mock()

    posted_second_time = await evaluator.evaluate_trace(trace)
    assert posted_second_time == 0
    assert mock_ollama.evaluate_rubric.call_count == 0
    assert mock_langfuse.post_score.call_count == 0
