# 🖥️ Hardware & Resource Sizing Guide

This document defines the hardware requirements, Docker Desktop resource configurations, and memory allocation budgets for the **QuarkDock** hybrid native ecosystem on Apple Silicon macOS.

---

## 🏛️ Host Machine Target Profile

QuarkDock is engineered for Apple Silicon (specifically **MacBook Pro M5 Pro 24GB Unified Memory**):
- **Processor**: Apple Silicon (M4 / M5 Pro or Max)
- **Host Physical Cores**: 14 to 18 cores
- **Host Physical Memory**: 24 GB Unified Memory
- **Host Operating System**: macOS Sonoma / Sequoia (Darwin ARM64)

---

## ⚡ Native Hybrid Architecture: Why Host Ollama Wins

Instead of running Ollama inside a Linux container (which has zero access to Apple Metal GPU or the Neural Engine and is forced to run on CPU), **QuarkDock runs Ollama natively on macOS**:

```
[macOS Host - 20 GB Unified Memory & 14 Cores]
├── Ollama (Native Apple Metal GPU Acceleration)  ──► 55 - 85 tokens/sec
├── OpenClaw Desktop / Bionics
└── Web Browser (React 19 UI :3002)

[Docker Desktop Linux VM - Only 4 GB RAM & 4 Cores Needed]
├── quarkdock-api (FastAPI + uvloop) (:8002)
├── quarkdock-ui (React 19 + Nginx) (:3002)
├── quarkdock-langfuse (Observability Web :3001)
├── quarkdock-postgres (Trace Storage :5432)
└── quarkdock-redis (Session Cache :6379)
```

---

## 🐳 Docker Desktop Resource Allocation Guidelines

Because the heavy LLM inference is handled natively by Apple Silicon Metal on the host, **Docker Desktop resource requirements are drastically downgraded**:

### Recommended Docker Desktop Settings (macOS)
1. **Memory**: **4.0 GB** (Previously required 12–14 GB when Ollama was containerized).
2. **CPUs**: **4 CPUs** (Previously required 10–14 CPUs).
3. **Swap**: **1.0 GB**.
4. **Virtual Machine Engine**: **Apple Virtualization framework**.
5. **File Sharing**: **VirtioFS**.

This leaves **20 GB RAM and 14 CPU cores** completely dedicated to host applications, native Metal GPU inference, and macOS multitasking!

---

## 📊 Container Memory Allocation Budget

Under Docker Compose, each container is constrained with explicit limits and reservations:

| Container Service | Memory Limit | Memory Reservation | Port Binding | Purpose |
|---|---|---|---|---|
| `quarkdock-langfuse` | 1.0 GB | 512 MB | `3001:3000` | Observability UI & Tracing |
| `quarkdock-postgres` | 512 MB | 256 MB | `5432:5432` | PostgreSQL 16 Trace DB |
| `quarkdock-api` | 512 MB | 128 MB | `8002:8000` | FastAPI Engine & OpenAI Gateway |
| `quarkdock-ui` | 256 MB | 64 MB | `3002:3000` | React 19 Frontend (Nginx) |
| `quarkdock-redis` | 256 MB | 64 MB | `6379:6379` | Cache & Session Store |
| **Total Docker Budget** | **~2.5 GB Max** | **~1.0 GB Idle** | — | — |

---

## 🚀 Native Host Inference Comparison

| Metric | Ollama in Docker (CPU) | Ollama on Host (Metal GPU) | Gain |
|---|---|---|---|
| **Acceleration Engine** | Linux ARM NEON (CPU) | Apple Silicon Metal (GPU) | **Hardware Acceleration** |
| **Tokens Per Second** | ~47 t/s | **55 – 85 t/s** | **+20% to +80% faster** |
| **Docker Memory Needed** | 12.0 GB | **4.0 GB** | **67% RAM freed for host** |
| **Host Fan Noise / Heat** | High CPU thermal load | **Whisper-quiet / Low thermal** | **Optimal battery life** |
