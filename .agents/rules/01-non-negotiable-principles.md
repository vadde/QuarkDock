# Rule 01: Non-Negotiable Core Principles

All autonomous agents, contributors, and automation pipelines working in the QuarkDock repository MUST adhere to these fundamental principles without exception.

---

## 1. Zero Hallucination Policy
- Never invent APIs, CLI arguments, Docker parameters, or library functions.
- If an endpoint or library parameter is uncertain, inspect the code, consult installed package type stubs, or verify via tests before implementing.
- Every claim of success must be backed by verifiable execution output (exit code 0, test pass, container healthcheck).

## 2. Spec-First Discipline (No Spec, No Code)
- No service, endpoint, or feature may be implemented without an approved specification in `specs/catalog/`.
- Implementation must conform to the interface contracts defined in the specification.
- Deviations require updating the specification first, not patching the code in silence.

## 3. Atomic Commit Integrity
- Every commit must represent exactly one logical unit of change.
- Commits must build, pass linting, and pass tests independently.
- Never mix refactoring, feature work, dependency updates, and documentation in a single commit.
- Strictly follow the Conventional Commits specification.

## 4. Blast Radius Containment
- QuarkDock is a distributed local ecosystem:
  - `services/api/`: FastAPI backend with Langfuse instrumentation
  - `services/ui/`: React 19 glassmorphic frontend
  - `deploy/compose/`: Docker orchestration
  - `eval/`: LLM-as-judge evaluation harness
- Changes to one service must NOT silently break another.
- Shared contracts (API schemas, SSE event shapes, environment variables) must be versioned and backwards-compatible.

## 5. Host & Hardware Stewardship (MacBook M5 Pro 24GB)
- Total container memory footprint MUST NOT exceed 16GB under maximum load.
- Always configure memory limits (`deploy.resources.limits.memory`) on all Docker services.
- Never spawn unbounded background loops or memory-leaking processes.
- Respect host ports: Ollama (11434), FastAPI (8000), UI (3000), Langfuse (3001), Redis (6379), Postgres (5432).

## 6. Security & Credential Hygiene
- NEVER commit secrets, API keys, tokens, or private credentials into source control.
- All secrets must pass via `.env` (gitignored) or runtime environment injection.
- Container services must drop unnecessary privileges where possible.

## 7. Memory & Compute Efficiency Standard (Rule 09 Compliance)
- Python code in `services/api/` must strictly enforce Rule 09 (`__slots__`, streaming-first, `uvloop`, `orjson`, connection pooling, generators).
- Every line of Python is scrutinized for allocations, latency, and throughput.
