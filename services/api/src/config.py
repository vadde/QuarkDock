from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """QuarkDock API Engine Environment Settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Application
    app_env: Literal["development", "production", "test"] = "development"
    app_name: str = "QuarkDock API"
    app_version: str = "0.1.0"
    log_level: str = "INFO"

    # Server Ports & Host
    host: str = "0.0.0.0"
    port: int = 8000

    # Model Engine (Ollama)
    ollama_base_url: str = Field(default="http://ollama:11434")
    ollama_model: str = Field(default="qwen2.5:7b")
    ollama_connect_timeout: float = 5.0
    ollama_read_timeout: float = 120.0

    # Redis Cache & Sessions
    redis_url: str = Field(default="redis://redis:6379/0")
    redis_pool_size: int = 20

    # Observability (Langfuse)
    langfuse_host: str = Field(default="http://langfuse:3000")
    langfuse_public_key: str = Field(default="pk-lf-quarkdock-local")
    langfuse_secret_key: str = Field(default="sk-lf-quarkdock-local")
    langfuse_enabled: bool = True

    # Security & CORS
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3002",
    ]
    max_concurrent_requests: int = 50


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached singleton instance of Settings (Rule 09 compliant)."""
    return Settings()
