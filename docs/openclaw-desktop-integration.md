# 🦾 OpenClaw Desktop & Host Applications Integration Guide

This guide explains how host macOS desktop applications (such as **OpenClaw Desktop**, **Bionics**, or any OpenAI-compatible client) connect to the local **QuarkDock** inference engine and Langfuse observability hub.

---

## 🏛️ Architecture Overview

```mermaid
flowchart TD
    subgraph macOS_Host["💻 macOS Host (Apple Silicon M5 Pro)"]
        OpenClaw["🦾 OpenClaw Desktop / Bionics"]
        Browser["🌐 Web Browser (React 19 UI :3002)"]
        Ollama["⚡ Ollama Metal GPU (:11434)"]
    end

    subgraph QuarkDock_Docker["🐳 QuarkDock Docker VM (4GB RAM / 4 CPUs)"]
        API["quarkdock-api (:8002)"]
        Langfuse["quarkdock-langfuse (:3001)"]
        Postgres["quarkdock-postgres (:5432)"]
        Redis["quarkdock-redis (:6379)"]
    end

    %% Mode A: Full Observability Tracing Gateway
    OpenClaw -->|Recommended: OpenAI Gateway :8002/v1| API
    Browser -->|SSE Chat :3002| API
    API -->|Async Trace Spans| Langfuse
    API -->|host.docker.internal:11434| Ollama

    %% Mode B: Direct Low-Overhead Loopback
    OpenClaw -.->|Direct Loopback :11434 (No Tracing)| Ollama
```

---

## ⚙️ OpenClaw Desktop Configuration

You have two connection modes depending on whether you want observability tracing in Langfuse:

### 🌟 Mode A: QuarkDock OpenAI Gateway (Recommended — Full Observability)
Connect through the QuarkDock API gateway so that every prompt, agent tool call, generation latency, and token count is **automatically traced into Langfuse**:

1. **Provider**: Select **OpenAI-Compatible** (or **Custom**).
2. **Base URL / Endpoint**:
   ```
   http://localhost:8002/v1
   ```
3. **API Key**: Any dummy string (e.g. `quarkdock-local` or `sk-local`).
4. **Model Name**:
   ```
   qwen2.5:7b
   ```
5. **Observability**: Open `http://localhost:3001` in your browser to view live generation traces, latency waterfalls, and token usage!

---

### ⚡ Mode B: Direct Native Metal Loopback (Zero Telemetry Overhead)
Connect directly to host Ollama if you do not need Langfuse traces:

1. **Provider**: Select **Ollama** (or **Custom OpenAI-compatible**).
2. **Base URL / Endpoint**:
   ```
   http://localhost:11434/v1
   ```
   *(For native Ollama protocol: `http://localhost:11434`)*
3. **API Key**: Any string (or blank).
4. **Model Name**:
   ```
   qwen2.5:7b
   ```

---

## 🧪 Verifying Connectivity from macOS Terminal

### 1. Test Gateway Models List (OpenAI Wire Format)
```bash
curl -s http://localhost:8002/v1/models | jq .
```

### 2. Test Non-Streaming Chat Completion via Gateway
```bash
curl -s -X POST http://localhost:8002/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5:7b",
    "messages": [
      {"role": "user", "content": "Respond in 3 words."}
    ],
    "stream": false
  }' | jq .
```

### 3. Test Streaming Inference via SSE
```bash
curl -N -s -X POST http://localhost:8002/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5:7b",
    "messages": [{"role": "user", "content": "Count from 1 to 5."}],
    "stream": true
  }'
```

---

## 🚀 Performance on Apple Silicon (M5 Pro 24GB)

| Metric | Docker CPU Container (Previous) | Native Metal GPU on Host (Current) |
|---|---|---|
| **Inference Hardware** | 14 Linux CPU Cores (NEON) | Apple M5 Pro Metal GPU + Unified Memory |
| **Generation Throughput** | ~47 tokens/sec | **~55 – 85 tokens/sec** |
| **Time to First Token (TTFT)** | ~220 ms | **~90 – 140 ms** |
| **Docker Desktop RAM Footprint** | 12.0 GB RAM | **< 2.0 GB RAM** |
| **Machine Thermal / Fan Noise** | Warm / High Fan Activity | **Whisper-quiet / Cool** |
| **Langfuse Tracing** | Supported | Supported via `:8002/v1` Gateway |
