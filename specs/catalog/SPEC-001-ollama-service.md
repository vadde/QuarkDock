# Service Specification: Local LLM Engine (Ollama)

- **Spec ID**: SPEC-001
- **Status**: PLANNED
- **Owner**: QuarkDock Core Architecture
- **Last Updated**: 2026-09-29

---

## 1. Overview & Purpose
Provides the local inference runtime for QuarkDock. It runs containerized inside Docker, serves `qwen2.5:7b` (default), and is exposed both internally to the FastAPI backend and externally to host macOS desktop applications (OpenClaw Desktop, Bionics) on port `11434`.

## 2. Architectural Boundaries & Dependencies
- **Container Name**: `quarkdock-ollama`
- **Internal Network**: `quarkdock-net` (addressable as `http://ollama:11434`)
- **Host Port Binding**: `11434:11434`
- **Upstream Dependencies**: None (self-contained C++ runtime)
- **Downstream Consumers**:
  - `services/api` (FastAPI chat completion & embeddings)
  - Host macOS desktop apps (OpenClaw, Bionics)
- **Persistent Storage**: Named Docker volume `ollama_data` mounted to `/root/.ollama` to persist pulled model weights across container restarts.

## 3. Resource Budget (MacBook M5 Pro Allocation)
- **Memory Limit**: 6.0 GB (hard cap in docker compose)
- **Memory Reservation**: 4.0 GB
- **CPU Limit**: 4 cores
- **Target Model**: `qwen2.5:7b-instruct-q4_K_M` (~4.7GB VRAM / RAM footprint)
- **Alternative Models**: `gemma3:4b` (~3.1GB), `llama3.2:8b` (~5.2GB)

## 4. Interface Contracts
- **Protocols**: HTTP REST / JSON streaming (NDJSON)
- **Endpoints**:
  - `GET /api/tags`: List loaded/cached models
  - `POST /api/generate`: Single prompt completion stream
  - `POST /api/chat`: Multi-turn chat message completion stream
  - `POST /api/pull`: Pull model weights by name
  - `GET /api/version`: Ollama daemon version

## 5. Failure Modes & Fallback Behavior
- **Weight Eviction**: If inactive, Ollama unloads weights after 5 minutes (default `OLLAMA_KEEP_ALIVE=24h` configured to keep model warm).
- **Restart Policy**: `unless-stopped` with healthcheck pinging `http://localhost:11434/api/tags`.
- **Healthcheck Interval**: 10s, timeout 5s, retries 3.

## 6. Acceptance Criteria
- [ ] `curl -s http://localhost:11434/api/tags` returns HTTP 200 with model catalog.
- [ ] OpenClaw Desktop on macOS host connects to `http://localhost:11434/v1` and streams tokens.
- [ ] Container memory does not exceed 6GB during active generation.
