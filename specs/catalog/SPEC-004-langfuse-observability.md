# Service Specification: Langfuse Observability & LLM-as-Judge

- **Spec ID**: SPEC-004
- **Status**: PLANNED
- **Owner**: QuarkDock Core Architecture & Observability
- **Last Updated**: 2026-09-29

---

## 1. Overview & Purpose
Self-hosted telemetry and evaluation stack utilizing Langfuse v3, PostgreSQL, and OpenTelemetry. Captures every LLM interaction, token usage, latency distribution, user rating, and automated LLM-as-judge evaluation score (correctness, groundedness, conciseness) for continuous model auditing.

## 2. Architectural Boundaries & Dependencies
- **Containers**:
  - `quarkdock-langfuse`: Langfuse Web & API server (`langfuse/langfuse:3`)
  - `quarkdock-postgres`: PostgreSQL 16 database for Langfuse metadata
  - `quarkdock-redis`: Redis 7 cache
  - `quarkdock-otel`: OpenTelemetry Collector
- **Internal Network**: `quarkdock-net`
- **Host Port Binding**: `3001:3000` (mapped to host 3001 to avoid collision with UI on 3000)
- **Database Port**: `5432:5432` (PostgreSQL)
- **Redis Port**: `6379:6379`
- **Upstream Dependencies**: None
- **Downstream Consumers**:
  - `services/api`: Publishes traces, spans, and scores via `langfuse` Python SDK
  - Developers / Evaluators: View traces, analytics, and prompts via web dashboard on `http://localhost:3001`

## 3. Resource Budget (MacBook M5 Pro Allocation)
- **Langfuse Web**: Limit 1.0 GB
- **PostgreSQL**: Limit 512 MB
- **Redis**: Limit 256 MB
- **OTEL Collector**: Limit 128 MB
- **Total Observability Footprint**: ~1.9 GB RAM

## 4. Instrumentation & Evaluation Capabilities
- **Traces & Spans**:
  - Full prompt, system instructions, generation params (temperature, top_p)
  - Time-to-first-token (TTFT) and total generation latency
  - Token counts (prompt tokens, completion tokens, total tokens)
- **Scores & Tags**:
  - User feedback: `user_rating` (+1 / -1)
  - Latency score: `ttft_ms`
  - Judge scores: `hallucination_score` (0.0-1.0), `helpfulness_score` (0.0-1.0)
- **LLM-as-Judge Runner**:
  - Automated evaluation harness in `eval/` that samples recent traces and asks local LLM (`qwen2.5:7b`) to evaluate output quality based on rubric prompts, publishing scores back to Langfuse via API.

## 5. Failure Modes & Fallback Behavior
- **Async Batching**: Langfuse SDK in FastAPI uses background thread worker pool with batch queue (`flush_interval=1.0s`, `max_batch_size=100`).
- **Network Partition**: If Langfuse is down, background queue drops oldest metrics gracefully after capacity limit to protect memory.

## 6. Acceptance Criteria
- [ ] Langfuse dashboard accessible at `http://localhost:3001`.
- [ ] Chat query through API creates full generation trace in Langfuse dashboard within 2 seconds.
- [ ] `make eval-judge` runs evaluation suite and updates trace scores in Langfuse.
