"""Unit tests for SQLite state manager."""

from pathlib import Path

from src.db import EvalStateManager


def test_eval_state_manager_lifecycle(temp_db_path: Path):
    manager = EvalStateManager(temp_db_path)
    assert manager.get_total_evaluations() == 0

    trace_id = "test-trace-123"
    assert not manager.is_evaluated(trace_id, "correctness")
    assert manager.get_evaluated_rubrics(trace_id) == set()

    # Record evaluation
    manager.record_evaluation(trace_id, "correctness", 0.8, "Good logic")
    assert manager.is_evaluated(trace_id, "correctness")
    assert not manager.is_evaluated(trace_id, "conciseness")
    assert manager.get_evaluated_rubrics(trace_id) == {"correctness"}
    assert manager.get_total_evaluations() == 1

    # Record second rubric
    manager.record_evaluation(trace_id, "conciseness", 1.0, "Very concise")
    assert manager.get_evaluated_rubrics(trace_id) == {"correctness", "conciseness"}
    assert manager.get_total_evaluations() == 2

    # Idempotent replace
    manager.record_evaluation(trace_id, "correctness", 1.0, "Updated logic")
    assert manager.get_total_evaluations() == 2
