# Service Context: API Engine (`services/api`)

- **Domain**: High-efficiency backend orchestrator & LLM proxy
- **Language & Runtime**: Python 3.12 + FastAPI + `uvloop`
- **Default Port**: `8000` (Docker internal & host mapped)
- **Primary Spec**: [`SPEC-002: FastAPI Backend Engine`](file:///specs/catalog/SPEC-002-fastapi-backend.md)
- **Efficiency Standard**: [`Rule 09: Python Efficiency Manifesto`](file:///.agents/rules/09-python-efficiency.md)

---

## 1. Architectural Mission
The API service serves as the core intelligence coordinator of QuarkDock:
1. Accepts chat requests from the React 19 UI and external API clients.
2. Proxies generation requests to the containerized Ollama engine (`http://ollama:11434`) via asynchronous streaming.
3. Injects end-to-end telemetry into Langfuse (`http://langfuse:3000`) for every trace, span, and generation token.
4. Manages conversation state and rate limiting via Redis (`redis://redis:6379`).
5. Exposes SSE event streams with client disconnect detection to cancel upstream LLM inference immediately if the user leaves.

---

## 2. Directory Layout & Module Plan
```
services/api/
├── CONTEXT.md                # Architectural context (this file)
├── DEVLOG.md                 # Reverse chronological engineering log
├── STATUS.md                 # Current operational and test status
├── Dockerfile                # Multi-stage slim Docker build
├── pyproject.toml            # Dependencies and tool configurations
├── src/
│   ├── __init__.py
│   ├── main.py               # FastAPI application factory & lifespan
│   ├── config.py             # Strongly typed settings via pydantic-settings
│   ├── core/
│   │   ├── __init__.py
│   │   ├── events.py         # SSE event formatting & stream helpers
│   │   └── lifespan.py       # Async startup/shutdown resource manager
│   ├── clients/
│   │   ├── __init__.py
│   │   ├── ollama.py         # Pooled HTTP/2 async Ollama client
│   │   ├── langfuse.py       # Async Langfuse telemetry wrapper
│   │   └── redis_cache.py    # Redis session & rate-limiting client
│   ├── models/
│   │   ├── __init__.py
│   │   ├── chat.py           # Pydantic v2 chat request/response schemas
│   │   └── telemetry.py      # Trace metadata & feedback schemas
│   └── routers/
│       ├── __init__.py
│       ├── chat.py           # /api/v1/chat streaming endpoint
│       ├── models.py         # /api/v1/models catalog endpoint
│       ├── feedback.py       # /api/v1/feedback rating endpoint
│       └── health.py         # /health readiness & liveness probe
└── tests/
    ├── conftest.py
    ├── test_chat.py
    └── test_health.py
```

---

## 3. Invariants & Rules
- **Rule 09 Strictly Enforced**: All internal classes must use `__slots__` or `@dataclass(slots=True)`. All JSON conversions must use `orjson`. No per-request HTTP client creation.
- **Fail-Open Observability**: If Langfuse is unreachable, chat generation continues unhindered.
- **Immediate Cancellation**: Check `await request.is_disconnected()` in streaming loops.
