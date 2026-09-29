# Engineering DevLog: API Engine (`services/api`)

---

## [2026-09-29] - Service Inception & Architectural Scaffolding
- **Author**: QuarkDock Core Architecture
- **Scope**: Scaffold service directory, context preservation triad, and module layout plan.
- **Decisions**:
  - Adopted Python 3.12 + FastAPI based on ADR-001 weighted analysis (best Langfuse SDK, rich LLM ecosystem).
  - Enforced Rule 09 (Python Performance & Memory Efficiency Manifesto) as a critical blocker for all backend code.
  - Specified shared connection pool design for Ollama and Langfuse to eliminate per-request TCP handshakes.

## [2026-09-29] - Core API Engine & Streaming Implementation (Phase 2)
- **Author**: QuarkDock Core Architecture
- **Scope**: High-efficiency backend implementation adhering strictly to Rule 09.
- **Components Added**:
  - `src/config.py`: Strongly typed `Settings` via `pydantic-settings` with `@lru_cache` singleton.
  - `src/core/events.py`: Low-overhead W3C SSE event formatter using `orjson.dumps()`.
  - `src/clients/ollama.py`: `OllamaClient` with `__slots__`, persistent HTTP/2 connection pool, and `AsyncIterator[str]` streaming generator.
  - `src/clients/redis_client.py`: `RedisManager` with connection pooling and fail-open resilience.
  - `src/clients/langfuse_client.py`: `LangfuseManager` with non-blocking async generation spans and fail-open trace recording.
  - `src/routers/chat.py`: `/api/v1/chat` SSE endpoint with `request.is_disconnected()` immediate upstream cancellation.
  - `src/routers/health.py`: `/health` diagnostic probe for ecosystem dependencies.
  - `src/routers/models.py`: `/api/v1/models` catalog endpoint.
  - `src/routers/feedback.py`: `/api/v1/feedback` rating endpoint.
  - `Dockerfile`: Multi-stage build (`python:3.12-slim`) with `uvloop` high-throughput event loop.
