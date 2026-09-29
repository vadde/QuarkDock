# Rule 08: Failure Modes & Automated Recovery

QuarkDock relies on local container infrastructure that may experience model eviction, port conflicts, network partitions, or resource exhaustion. Services and agents must implement defensive patterns.

---

## Failure Classifications & Recovery Tactics

### 1. Model Engine Eviction or Out of Memory (OOM)
- **Symptom**: Ollama container crashes or returns HTTP 500/504 when loading weights.
- **Root Cause**: Host RAM or Docker memory limit exceeded.
- **Recovery Policy**:
  - Ollama container restart policy must be `unless-stopped` with healthcheck.
  - API service implements exponential backoff retry with jitter (3 attempts: 1s, 2s, 4s).
  - FastAPI returns structured 503 Service Unavailable:
    ```json
    {
      "error": "MODEL_OOM_OR_EVICTED",
      "message": "Local LLM is reloading weights. Please retry in 5 seconds.",
      "retry_after_seconds": 5
    }
    ```

### 2. Telemetry / Observability Offline (Langfuse / OTEL)
- **Symptom**: Langfuse server or Postgres database is starting up or fails.
- **Root Cause**: Postgres migration in flight or network hiccup.
- **Recovery Policy**:
  - Telemetry MUST NEVER be on the critical path of user inference.
  - Wrap all Langfuse trace generation in non-blocking async handlers or background tasks.
  - Fail-open: If Langfuse endpoint fails, log warning locally and deliver LLM stream uninterrupted to user.

### 3. Client Disconnect During Streaming (SSE)
- **Symptom**: User closes browser tab or navigates away mid-generation.
- **Root Cause**: Cancelled HTTP request.
- **Recovery Policy**:
  - Monitor `request.is_disconnected()` in the FastAPI SSE generator loop.
  - When disconnected, immediately cancel the upstream Ollama generation to reclaim GPU/CPU cycles instantly.

### 4. Port Conflict on Startup
- **Symptom**: Docker compose fails with `port is already allocated`.
- **Root Cause**: Native host service (e.g. native Postgres or native Ollama) running on host port.
- **Recovery Policy**:
  - Use `make doctor` or `lsof -i :<port>` to detect colliding PID.
  - Docker Compose ports are configurable via `.env` variables (`OLLAMA_PORT`, `API_PORT`, `UI_PORT`, `LANGFUSE_PORT`).
