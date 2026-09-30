"""Pytest fixtures for eval-worker."""

from pathlib import Path

import pytest


@pytest.fixture
def temp_db_path(tmp_path: Path) -> Path:
    return tmp_path / "test_eval_state.db"
