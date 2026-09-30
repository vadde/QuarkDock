# Changelog

All notable changes to the QuarkDock ecosystem will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.2.0-beta] - 2026-09-30

### Added
- **Decoupled LLM-as-a-Judge Evaluation Worker (`services/eval-worker`)**: Autonomous background worker polling Langfuse Public REST API (`/api/public/traces`) for chat interactions, evaluating quality with local Metal GPU Ollama judge models (`qwen2.5:7b`) on correctness, conciseness, and helpfulness rubrics, and publishing scores to `/api/public/scores`.
- **Durable Watermark Persistence**: Local SQLite database (`eval_state.db` in Docker volume `eval_data`) guaranteeing monotonic exactly-once processing across restarts.
- **Specification SPEC-005**: Full SDD specification in `specs/catalog/SPEC-005-eval-worker.md` with resource budget (256MB cap) and interface contracts.
- **Client Eval Toggle (`ENABLE_CLIENT_EVAL`)**: Feature toggle defaulting to `false` across API and eval harnesses, cleanly separating chat generation from evaluation pipelines.

---

## [0.1.0-alpha] - 2026-09-29

### Added
- **Containerized LLM Engine**: Dockerized Ollama serving `qwen2.5:7b` (4.7 GB quantized weights), exposed to macOS host on port `11434` for OpenClaw Desktop and Bionics at ~47 tokens/sec.
- **High-Efficiency FastAPI Backend**: Python 3.12 backend on port `8002` strictly adhering to Rule 09 (`__slots__`, `uvloop`, `orjson`, shared HTTP/2 connection pooling, and zero-copy streaming).
- **Glassmorphic React 19 Chat UI**: React 19 frontend on port `3002` with Liquid Glass, Acrylic blur, Fluent motion, and Plasma aura CSS design system.
- **Deep Observability**: Self-hosted Langfuse v2 stack with PostgreSQL 16 and Redis 7 on port `3001` tracing every token, span, latency distribution, and user feedback score.
- **LLM-as-a-Judge Evaluation Harness**: Automated quality benchmark runner (`make eval-judge`) achieving an overall quality index of **4.78 / 5.00** across Correctness, Conciseness, and Helpfulness.
- **Hardware Sizing & Diagnostics**: `docs/hardware-and-resource-sizing.md` and enhanced `make doctor` auditing Docker memory and CPU allocations for Apple Silicon M5 Pro.
- **Enterprise Governance**: Spec-Driven Development framework (`specs/_templates/`, `specs/catalog/SPEC-001` through `SPEC-004`), Agent Rules (`.agents/rules/01-09`), and SDLC lifecycle status board.
