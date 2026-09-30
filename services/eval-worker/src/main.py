"""Entry point and async lifecycle daemon for QuarkDock Evaluation Worker."""

from __future__ import annotations

import asyncio
import logging
import signal
import sys

from src.clients.langfuse import LangfuseApiClient
from src.clients.ollama import OllamaJudgeClient
from src.config import get_settings
from src.db import EvalStateManager
from src.evaluator import TraceEvaluator

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("eval-worker")


async def main() -> None:
    settings = get_settings()

    logger.info("=" * 60)
    logger.info("⚖️  Starting QuarkDock LLM-as-a-Judge Evaluation Worker")
    logger.info("   • Langfuse Host:    %s", settings.langfuse_host)
    logger.info("   • Ollama Engine:    %s (%s)", settings.ollama_base_url, settings.judge_model)
    logger.info("   • Poll Interval:    %.1fs", settings.poll_interval_sec)
    logger.info("   • State DB:         %s", settings.resolved_db_path)
    logger.info("=" * 60)

    # Initialize State Manager
    state_mgr = EvalStateManager(settings.resolved_db_path)
    initial_count = state_mgr.get_total_evaluations()
    logger.info("Initialized state manager with %d historical evaluations", initial_count)

    # Initialize API Clients
    langfuse_client = LangfuseApiClient(
        base_url=settings.langfuse_host,
        public_key=settings.langfuse_public_key,
        secret_key=settings.langfuse_secret_key,
    )

    ollama_client = OllamaJudgeClient(
        base_url=settings.ollama_base_url,
        model=settings.judge_model,
        timeout_sec=settings.request_timeout_sec,
    )

    evaluator = TraceEvaluator(
        langfuse_client=langfuse_client,
        ollama_client=ollama_client,
        state_mgr=state_mgr,
    )

    # Graceful shutdown handler
    shutdown_event = asyncio.Event()

    def handle_signal(sig: int, _frame: object) -> None:
        logger.info("Received exit signal (%d). Shutting down eval-worker...", sig)
        shutdown_event.set()

    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)

    logger.info("Evaluation poller loop active. Listening for unevaluated traces...")

    try:
        while not shutdown_event.is_set():
            try:
                scored = await evaluator.run_evaluation_cycle(limit=settings.batch_size)
                if scored > 0:
                    logger.info("Successfully posted %d new rubric evaluations.", scored)
            except Exception as exc:
                logger.error("Error encountered in evaluation cycle: %s", exc, exc_info=True)

            try:
                # Sleep in small increments to be responsive to shutdown signals
                for _ in range(int(settings.poll_interval_sec * 2)):
                    if shutdown_event.is_set():
                        break
                    await asyncio.sleep(0.5)
            except asyncio.CancelledError:
                break
    finally:
        logger.info("Flushing and closing HTTP connections...")
        await langfuse_client.aclose()
        await ollama_client.aclose()
        logger.info(
            "Evaluation worker shutdown complete. Total evaluations: %d",
            state_mgr.get_total_evaluations(),
        )


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        sys.exit(0)
