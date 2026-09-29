# Service Specification: FastAPI Backend Engine

- **Spec ID**: SPEC-002
- **Status**: PLANNED
- **Owner**: QuarkDock Core Architecture
- **Last Updated**: 2026-09-29

---

## 1. Overview & Purpose
High-performance async Python 3.12 backend orchestrating chat completions, SSE streaming, model management, session caching, and full Langfuse observability (traces, spans, generations, user feedback, evaluation hooks). Enforces Rule 09 (Python Efficiency) on every endpoint.

## 2. Architectural Boundaries & Dependencies
- **Container Name**: `quarkdock-api`
- **Internal Network**: `quarkdock-net` (addressable as `http://api:8000`)
- **Host Port Binding**: `8000:8000`
- **Upstream Dependencies**:
  - `ollama`: `http://ollama:11434`
  - `langfuse`: `http://langfuse:3000`
  - `redis`: `redis://redis:6379/0`
- **Downstream Consumers**:
  - `services/ui` (React 19 chat frontend)
  - Evaluators / test runners
- **Persistent Storage**: None (stateless; persistence delegated to Postgres/Redis/Ollama)

## 3. Resource Budget (MacBook M5 Pro Allocation)
- **Memory Limit**: 512 MB
- **Memory Reservation**: 128 MB
- **CPU Limit**: 2 cores
- **Concurrency**: 50 concurrent SSE streaming requests with `uvloop`
- **Connection Pool**: Single shared `httpx.AsyncClient` with HTTP/2 keep-alive

## 4. Interface Contracts
- **Protocols**: HTTP REST / Server-Sent Events (SSE) / JSON via `orjson`
- **Core Endpoints**:
  - `GET /health`: Readiness, liveness, and downstream dependency health check
  - `GET /api/v1/models`: List available models from Ollama with metadata
  - `POST /api/v1/chat`: Streaming SSE chat generation with Langfuse trace ID injection
  - `POST /api/v1/feedback`: Submit user feedback (+1 / -1 / score) attached to Langfuse trace
  - `GET /api/v1/metrics`: Prometheus / OpenTelemetry telemetry scrape endpoint

### SSE Event Format
```
event: token
data: {"text": "Hello", "index": 0}

event: trace
data: {"trace_id": "lf_trace_98234...", "url": "http://localhost:3001/project/..."}

event: done
data: {"total_tokens": 42, "eval_duration_ms": 310}
```

## 5. Failure Modes & Fallback Behavior
- **Ollama Timeout**: If Ollama does not return first token within 10s, yield typed SSE error event and close stream cleanly.
- **Langfuse Outage**: Fail-open; generation proceeds normally with a local logger warning if Langfuse is unreachable.
- **Redis Outage**: Degrades to in-memory LRU session cache.

## 6. Acceptance Criteria
- [ ] `GET /health` returns HTTP 200 with status of Ollama, Redis, and Langfuse.
- [ ] `POST /api/v1/chat` streams SSE tokens with zero buffering.
- [ ] Langfuse trace accurately records prompt, completion, latency, and token count.
- [ ] Memory footprint remains under 200MB under load.
