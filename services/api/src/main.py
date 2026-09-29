from __future__ import annotations

import logging
import sys
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.clients.langfuse_client import LangfuseManager
from src.clients.ollama import OllamaClient
from src.clients.redis_client import RedisManager
from src.config import get_settings
from src.routers import chat, feedback, health, models

# Rule 09: Install uvloop for high-efficiency event loop on Linux/macOS
if sys.platform != "win32":
    try:
        import uvloop

        uvloop.install()
    except ImportError:
        pass

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("quarkdock.api")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Manage application startup and shutdown lifecycle (Rule 09 compliant)."""
    settings = get_settings()
    logger.info("Initializing QuarkDock API engine (%s)...", settings.app_env)

    # 1. Initialize persistent resource clients
    app.state.settings = settings
    app.state.version = settings.app_version
    app.state.ollama = OllamaClient(settings)
    app.state.redis = RedisManager(settings)
    app.state.langfuse = LangfuseManager(settings)

    logger.info("QuarkDock API resources initialized.")

    try:
        yield
    finally:
        # Clean teardown of connection pools
        logger.info("Shutting down QuarkDock API engine...")
        await app.state.ollama.close()
        await app.state.redis.close()
        await app.state.langfuse.shutdown()
        logger.info("QuarkDock API teardown complete.")


def create_app() -> FastAPI:
    """FastAPI application factory."""
    settings = get_settings()

    app = FastAPI(
        title="QuarkDock API Engine",
        version=settings.app_version,
        description="High-efficiency local LLM inference orchestrator with Langfuse observability",
        lifespan=lifespan,
    )

    # CORS configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include API routers
    app.include_router(health.router)
    app.include_router(models.router)
    app.include_router(chat.router)
    app.include_router(feedback.router)

    return app


app = create_app()
