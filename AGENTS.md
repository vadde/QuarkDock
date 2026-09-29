# QuarkDock Agent Operating Hub (`AGENTS.md`)

Welcome to the **QuarkDock** repository. This document defines the engineering protocols, architecture standards, and operational guardrails for all AI agents and contributors working within this codebase.

---

## 🏛️ Ecosystem Overview

QuarkDock is a high-performance local AI ecosystem engineered for macOS Apple Silicon (specifically M5 Pro 24GB):
- **Model Engine**: Ollama serving Qwen2.5:7B (and Gemma 3, Llama 3.2), accessible both inside Docker and to host macOS apps (OpenClaw Desktop, Bionics) on port `11434`.
- **Backend**: FastAPI (Python 3.12) with high-efficiency async design, streaming-first SSE, connection pooling, and deep Langfuse tracing / evaluation on port `8000`.
- **Frontend**: React 19 chat interface on port `3000` with liquid glass, fluent motion, acrylic transparency, and plasma aura visual design.
- **Observability**: Self-hosted Langfuse v3 web UI on port `3001` (internal `3000`), Postgres `5432`, Redis `6379`, and OpenTelemetry Collector `4317/4318`.

---

## 📜 Master Rules Index (`.agents/rules/`)

Every agent and human contributor MUST follow these rules:

| Rule | Title | Summary |
|------|-------|---------|
| [Rule 01](file:///.agents/rules/01-non-negotiable-principles.md) | **Non-Negotiable Principles** | Zero hallucination, spec-first discipline, host hardware stewardship (16GB max), atomic commits. |
| [Rule 02](file:///.agents/rules/02-atomic-commit-protocol.md) | **Atomic Commit Protocol** | Conventional Commits, single logical change per commit, imperative present tense, explicit scopes (`api`, `ui`, `infra`, `repo`, etc.). |
| [Rule 03](file:///.agents/rules/03-spec-driven-development.md) | **Spec-Driven Development** | No code without a spec in `specs/catalog/`. Strict prevention of spec drift. |
| [Rule 04](file:///.agents/rules/04-cross-service-blast-radius.md) | **Cross-Service Blast Radius** | Port isolation matrix, resilient fail-open telemetry, typed error handling, host exposure safeguards. |
| [Rule 05](file:///.agents/rules/05-sdlc-lifecycle-governance.md) | **SDLC Governance** | Status lifecycle (`DRAFT` → `DONE`), `sdlc/status-board.md`, service `DEVLOG.md` & `STATUS.md`. |
| [Rule 06](file:///.agents/rules/06-agent-autonomy-boundaries.md) | **Agent Autonomy Boundaries** | Pre-approved actions vs gated actions requiring explicit user consent. |
| [Rule 07](file:///.agents/rules/07-service-context-preservation.md) | **Service Context Preservation** | Service Triad: `CONTEXT.md`, `DEVLOG.md`, `STATUS.md` in every service directory. |
| [Rule 08](file:///.agents/rules/08-failure-modes-recovery.md) | **Failure Modes & Recovery** | Automated patterns for model eviction, telemetry failure, SSE disconnects, and port conflicts. |
| [Rule 09](file:///.agents/rules/09-python-efficiency.md) | **Python Efficiency Manifesto** | 🔴 Critical: `__slots__`, generators, `orjson`, `uvloop`, connection pooling, zero-copy slicing, O(1) structures. |
| [Rule 10](file:///.agents/rules/10-intellectual-honesty-critique.md) | **Intellectual Honesty & Critique** | Anti-Yes-Man protocol, dialectic critique & praise quadrant, rigorous self-critique. |

---

## ⚡ Quick Operational Commands

All operations are orchestrated through the root `Makefile`:

```bash
make help         # View all available targets and descriptions
make dev          # Start full ecosystem in background (docker compose up)
make logs         # Follow logs from all ecosystem containers
make test         # Run unit and integration tests across services
make lint         # Run ruff and type-checks on Python, eslint on UI
make eval-judge   # Run LLM-as-judge benchmark evaluation
make status       # Show health and resource usage across all containers
```

---

## 🛡️ Non-Negotiable Invariants
1. **Never commit secrets or tokens** into git.
2. **Never break streaming**: Chat responses must stream via SSE chunks without buffering.
3. **Never allow unbounded concurrency**: Cap concurrent requests and connection pools.
4. **Always verify before declaring done**: Run tests, verify container health, check status.
