# Rule 04: Cross-Service Blast Radius & Dependency Contracts

QuarkDock consists of loosely coupled, highly focused services operating in a unified Docker network. Changes to one service must strictly guard against cascading failures across the boundary.

---

## Architectural Boundaries

```
[Host / Browser / OpenClaw]
             │
      ┌──────┴──────┐
      │             │
   :3000          :8000
 [UI Service]  [API Service] ───────────────┐
      │             │                       │
      │        (HTTP / SSE)                 │ (OTLP / Traces)
      │             │                       │
      │        ┌────┴─────────────────┐     │
      │        ▼                      ▼     ▼
      │   [Ollama LLM]            [Langfuse Tracing]
      │      :11434                    :3001
      │        │                         │
      └────────┼─────────────────────────┘
               │ (Direct LLM access for macOS apps)
```

---

## Service Contracts & Blast Radius Rules

### 1. API Service (`services/api/`)
- **Downstream dependencies**: Ollama (`http://ollama:11434`), Langfuse (`http://langfuse:3000` internal), Redis (`redis://redis:6379`).
- **Resilience Mandate**: If Langfuse is unreachable, LLM generation MUST proceed without crashing (fail-open telemetry logging to stdout).
- **If Ollama is unreachable**: Return typed HTTP 503 error with clear retry semantics (`{"error": "model_unavailable", "retry_after": 5}`).
- **If Redis is unreachable**: Degrade gracefully to in-memory session cache.

### 2. UI Service (`services/ui/`)
- **Backend dependency**: API service (`http://api:8000` or `/api` reverse proxy).
- **Resilience Mandate**: Handle connection dropped during SSE streaming gracefully (reconnect button, preserve partial message in UI state).
- **Never crash the React tree**: Enforce top-level and component-level Error Boundaries.

### 3. Model Engine (`ollama`)
- Exposed to host on `11434` for external host applications (OpenClaw, Bionics).
- Container network name is `ollama`. Internal services address it as `http://ollama:11434`.
- Model downloads/pulls must be idempotent and non-blocking during startup.

### 4. Port Collision Prevention
| Service | Internal Port | Host Port | Protocol |
|---------|---------------|-----------|----------|
| UI | 3000 | 3000 | HTTP |
| API | 8000 | 8000 | HTTP / SSE |
| Langfuse Web | 3000 | 3001 | HTTP |
| Ollama | 11434 | 11434 | HTTP |
| Redis | 6379 | 6379 | RESP |
| PostgreSQL | 5432 | 5432 | TCP |
| OTEL Collector | 4317 / 4318 | 4317 / 4318 | gRPC / HTTP |

*Notice: Langfuse internal port 3000 is mapped to host port 3001 to prevent collision with UI (host port 3000).*
