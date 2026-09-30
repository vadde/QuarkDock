"""SQLite state checkpoint and watermark manager for idempotent evaluation."""

from __future__ import annotations

import sqlite3
from pathlib import Path


class EvalStateManager:
    """Manages evaluation watermark and idempotency state in a lightweight SQLite database."""

    __slots__ = ("_db_path",)

    def __init__(self, db_path: Path | str) -> None:
        self._db_path = Path(db_path)
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path, timeout=10.0)
        conn.execute("PRAGMA journal_mode = WAL;")
        conn.execute("PRAGMA synchronous = NORMAL;")
        return conn

    def _init_db(self) -> None:
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        with self._get_connection() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS evaluated_traces (
                    trace_id TEXT NOT NULL,
                    rubric TEXT NOT NULL,
                    score REAL NOT NULL,
                    comment TEXT,
                    evaluated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (trace_id, rubric)
                );
                """
            )
            conn.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_trace_id ON evaluated_traces(trace_id);
                """
            )

    def is_evaluated(self, trace_id: str, rubric: str) -> bool:
        """Check if a specific trace and rubric combination has already been evaluated."""
        with self._get_connection() as conn:
            cur = conn.execute(
                "SELECT 1 FROM evaluated_traces WHERE trace_id = ? AND rubric = ? LIMIT 1;",
                (trace_id, rubric),
            )
            return cur.fetchone() is not None

    def get_evaluated_rubrics(self, trace_id: str) -> set[str]:
        """Return the set of rubrics already completed for a given trace."""
        with self._get_connection() as conn:
            cur = conn.execute(
                "SELECT rubric FROM evaluated_traces WHERE trace_id = ?;",
                (trace_id,),
            )
            return {row[0] for row in cur.fetchall()}

    def record_evaluation(
        self,
        trace_id: str,
        rubric: str,
        score: float,
        comment: str = "",
    ) -> None:
        """Persist a completed evaluation into SQLite."""
        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO evaluated_traces (trace_id, rubric, score, comment)
                VALUES (?, ?, ?, ?);
                """,
                (trace_id, rubric, score, comment),
            )

    def get_total_evaluations(self) -> int:
        """Return total count of rubric evaluations stored."""
        with self._get_connection() as conn:
            cur = conn.execute("SELECT COUNT(*) FROM evaluated_traces;")
            row = cur.fetchone()
            return int(row[0]) if row else 0
