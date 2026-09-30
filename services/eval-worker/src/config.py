"""Configuration settings for the QuarkDock Evaluation Worker."""

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class WorkerSettings(BaseSettings):
    """Strongly typed evaluation worker settings with environment overrides."""

    model_config = SettingsConfigDict(
        env_file=(".env", "deploy/compose/.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Langfuse Connection
    langfuse_host: str = Field(
        default="http://langfuse:3000",
        description="Internal or external Langfuse URL",
    )
    langfuse_public_key: str = Field(
        default="pk-lf-quarkdock-local",
        description="Langfuse public API key",
    )
    langfuse_secret_key: str = Field(
        default="sk-lf-quarkdock-local",
        description="Langfuse secret API key",
    )

    # Ollama Judge Engine
    ollama_base_url: str = Field(
        default="http://host.docker.internal:11434",
        description="Ollama engine endpoint on host Metal GPU",
    )
    judge_model: str = Field(
        default="qwen2.5:7b",
        description="Model identifier to use as judge",
    )

    # Polling & Worker Lifecycle
    poll_interval_sec: float = Field(
        default=15.0,
        description="Polling frequency in seconds for new traces",
    )
    batch_size: int = Field(
        default=10,
        description="Maximum traces to fetch and evaluate per polling cycle",
    )
    request_timeout_sec: float = Field(
        default=60.0,
        description="Max timeout for judge inference in seconds",
    )

    # Persistence
    db_path: str = Field(
        default="/data/eval_state.db",
        description="Path to SQLite watermark persistence database",
    )

    @property
    def resolved_db_path(self) -> Path:
        """Resolve database path, falling back to local dir if /data is not writable."""
        p = Path(self.db_path)
        try:
            p.parent.mkdir(parents=True, exist_ok=True)
            return p
        except (PermissionError, OSError):
            fallback = Path("./eval_state.db").resolve()
            fallback.parent.mkdir(parents=True, exist_ok=True)
            return fallback


@lru_cache(maxsize=1)
def get_settings() -> WorkerSettings:
    """Return cached singleton instance of WorkerSettings."""
    return WorkerSettings()
