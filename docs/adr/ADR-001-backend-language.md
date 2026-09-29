# ADR-001: Backend Language Selection — Python 3.12 + FastAPI

- **Status**: ACCEPTED
- **Deciders**: QuarkDock Core Architecture & Lead Engineer
- **Date**: 2026-09-29

---

## 1. Context & Problem Statement
QuarkDock requires an orchestration backend that serves as an LLM proxy to a local Ollama instance, streams Server-Sent Events (SSE) to a modern React 19 UI, and interfaces deeply with Langfuse v3 for tracing, spans, session tracking, and LLM-as-judge automated evaluations.

The core question was whether to adopt Python 3.12 (FastAPI), TypeScript/Bun (Hono), Go (Chi/Fiber), or Rust (Axum).

---

## 2. Langfuse SDK & Ecosystem Landscape

| Language | SDK Status | Maturity | Feature Parity |
|----------|-----------|----------|----------------|
| **Python** | ✅ Official 1st-party SDK (`langfuse` v4.7+) | Production-grade | 100% — full traces, generations, scores, prompt management, datasets, evaluations |
| **TypeScript/JS** | ✅ Official 1st-party SDK (`@langfuse/tracing` v5.4+) | Production-grade | ~95% — full traces, scores, Vercel AI SDK integration, prompt mgmt |
| **Go** | ⚠️ No native SDK — use OTEL ingestion endpoint | Community/DIY | ~70% — traces via OTLP, scores via REST API, no prompt management SDK |
| **Rust** | ⚠️ No native SDK — `langfuse` crate exists (community) | Experimental | ~50% — basic trace ingestion, scores via REST, limited feature set |

---

## 3. Evaluation Dimensions & Weighted Decision Matrix

| Criterion | Weight | Python 3.12 | Go | TypeScript | Rust |
|-----------|--------|-------------|----|------------|------|
| Langfuse depth | 25% | 5 (1.25) | 2 (0.50) | 5 (1.25) | 1 (0.25) |
| LLM ecosystem | 20% | 5 (1.00) | 2 (0.40) | 4 (0.80) | 1 (0.20) |
| OTEL support | 15% | 5 (0.75) | 5 (0.75) | 4 (0.60) | 4 (0.60) |
| Dev velocity | 15% | 5 (0.75) | 3 (0.45) | 4 (0.60) | 2 (0.30) |
| Streaming | 10% | 4 (0.40) | 4 (0.40) | 5 (0.50) | 4 (0.40) |
| Performance | 5% | 3 (0.15) | 5 (0.25) | 4 (0.20) | 5 (0.25) |
| Type safety | 5% | 4 (0.20) | 5 (0.25) | 4 (0.20) | 5 (0.25) |
| Memory | 5% | 3 (0.15) | 5 (0.25) | 3 (0.15) | 5 (0.25) |
| **TOTAL** | **100%** | **4.65** | **3.25** | **4.30** | **2.50** |

---

## 4. Key Architectural Insights
1. **I/O-Bound Workload**: The backend's critical path is I/O-bound proxying to Ollama and streaming SSE tokens. The local inference engine (Ollama) takes 2–10 seconds per generation; a 2ms vs 10ms proxy overhead is negligible in the end-to-end latency budget.
2. **Langfuse Parity**: Python is the primary platform for Langfuse prompt experiments, evaluation SDKs, and dataset management.
3. **Efficiency Mitigation**: To address potential memory bloat or sloppy allocations typical in casual Python, QuarkDock authored and strictly enforces **Rule 09 (Python Efficiency Manifesto)** across all backend code (`__slots__`, `uvloop`, `orjson`, connection pooling, generators over lists, zero-copy memory views).

---

## 5. Decision Outcome
- **Accepted Option**: Python 3.12 + FastAPI + `uvloop` + `orjson`.
- **Enforcement**: Mandatory compliance with `.agents/rules/09-python-efficiency.md`.
