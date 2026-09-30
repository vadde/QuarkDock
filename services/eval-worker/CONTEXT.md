# Service Context: Evaluation Worker (`services/eval-worker`)

- **Domain**: Decoupled asynchronous quality adjudication & LLM-as-a-judge runner
- **Language & Runtime**: Python 3.12 + `asyncio` + `httpx`
- **Default Port**: None (internal background daemon)
- **Primary Spec**: [`SPEC-005: Automated LLM-as-Judge Evaluation Worker`](file:///specs/catalog/SPEC-005-eval-worker.md)
- **Efficiency Standard**: [`Rule 09: Python Efficiency Manifesto`](file:///.agents/rules/09-python-efficiency.md)

---

## 1. Architectural Mission
The `eval-worker` decouples LLM output adjudication from all client applications:
1. Operates as an autonomous background daemon in the `quarkdock-net` Docker network.
2. Interrogates the Langfuse REST API (`/api/public/traces`) periodically for new chat interactions.
3. Evaluates prompt and response pairs against standardized quality rubrics (`correctness`, `conciseness`, `helpfulness`) using the native Apple Silicon Metal-accelerated Ollama engine (`http://host.docker.internal:11434`).
4. Posts normalized scores and judge rationales back to Langfuse (`/api/public/scores`).
5. Persists a local SQLite watermark (`eval_state.db`) to ensure monotonic, exactly-once evaluation without duplicate scoring across restarts.

---

## 2. Directory Layout & Module Plan
```
services/eval-worker/
├── CONTEXT.md                # Architectural context (this file)
├── DEVLOG.md                 # Reverse chronological engineering log
├── STATUS.md                 # Current operational and test status
├── README.md                 # Service overview & local execution guide
├── Dockerfile                # Multi-stage slim Docker build
├── pyproject.toml            # Dependencies and tool configurations
├── src/
│   ├── __init__.py
│   ├── config.py             # Strongly typed settings via pydantic-settings
│   ├── db.py                 # SQLite checkpoint & watermark manager
│   ├── rubrics.py            # Adjudication rubrics & prompt templates
│   ├── clients/
│   │   ├── __init__.py
│   │   ├── langfuse.py       # Async HTTP/2 Langfuse public API client
│   │   └── ollama.py         # Async HTTP/2 Ollama judge client
│   ├── evaluator.py          # Trace evaluation orchestrator
│   └── main.py               # Async lifecycle daemon & graceful shutdown loop
└── tests/
    ├── conftest.py
    ├── test_db.py
    ├── test_rubrics.py
    └── test_evaluator.py
```

---

## 3. Invariants & Rules
- **Rule 09 Strictly Enforced**: All data classes and client classes use `__slots__` or `@dataclass(slots=True)`. Single shared `httpx.AsyncClient` connection pools for Ollama and Langfuse.
- **Fail-Open Resilience**: If Langfuse or Ollama is temporarily unavailable, worker backs off exponentially without crashing or corrupting state.
- **Zero Client Impact**: Client chat streaming and OpenClaw sessions are never blocked or slowed down by background evaluations.
