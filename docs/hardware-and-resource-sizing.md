# 🖥️ Hardware & Resource Sizing Guide

This document defines the strict hardware requirements, Docker Desktop resource configurations, and memory allocation budgets for the **QuarkDock** ecosystem on Apple Silicon macOS.

---

## 🏛️ Host Machine Target Profile

QuarkDock was engineered with the following primary host benchmark:
- **Processor**: Apple Silicon (M4 / M5 Pro or Max)
- **Host Physical Cores**: 14 to 18 cores
- **Host Physical Memory**: 24 GB Unified Memory (minimum 16 GB supported for trimmed workloads)
- **Host Operating System**: macOS Sonoma / Sequoia (Darwin ARM64)

---

## 🐳 Docker Desktop Resource Allocation Guidelines

Because Docker Desktop runs Linux containers inside a lightweight Virtualization framework VM on macOS, **container resource limits (`limits.memory`, `limits.cpus`) are hard-bounded by the VM's total allocation.**

### Allocation Tiers

| Profile Tier | Host Physical RAM | Docker Desktop RAM | Docker Desktop CPUs | Recommended Models | Expected Token Rate |
|---|---|---|---|---|---|
| **Minimal** (Testing) | 16 GB | **10.0 GB** | **8 CPUs** | `qwen2.5:3b`, `gemma3:4b` | 20–30 t/s |
| **Standard** (Default) | 24 GB | **12.0 – 14.0 GB** | **10 – 12 CPUs** | `qwen2.5:7b-instruct-q4` | 18–25 t/s |
| **Power User** | 24 GB – 36 GB+ | **16.0 GB** | **12 – 14 CPUs** | `qwen2.5:7b`, `llama3.2:8b` | 25–35 t/s |

### Critical Docker Desktop Settings (macOS)
1. **Memory**: Allocate at least **12 GB** (ideally **14–16 GB** on a 24GB machine).
2. **CPUs**: Allocate **10 to 14 CPUs** (out of 18).
3. **Swap**: Set to **2 GB** (buffer against sudden burst spikes during trace ingestion).
4. **Virtual Disk Limit**: Minimum **64 GB** (each quantized 7B model is ~4.5–5.0 GB on disk).
5. **Virtual Machine Engine**: Enable **"Use Apple Virtualization framework"** (faster syscalls & lower idle power).
6. **File Sharing Implementation**: Enable **"VirtioFS"** (drastically reduces bind-mount I/O latency).

---

## 📊 Container Memory Allocation Budget (Docker Compose)

Under Docker Compose, each container service is constrained with explicit memory limits and reservations to prevent a single service from starving the host or triggering the Linux OOM killer:

```
Total Docker VM Capacity: 12.0 – 14.0 GB
┌──────────────────────────────────────────────────────────┐
│  quarkdock-ollama (Limit: 6.0 GB / Reserv: 4.0 GB)       │  ◄── Model weights + KV Cache
├──────────────────────────────────────────────────────────┤
│  quarkdock-langfuse (Limit: 1.0 GB / Reserv: 512 MB)     │  ◄── Observability Web + Worker
├──────────────────────────────────────────────────────────┤
│  quarkdock-postgres (Limit: 512 MB / Reserv: 256 MB)     │  ◄── Trace Database
├──────────────────────────────────────────────────────────┤
│  quarkdock-api (Limit: 512 MB / Reserv: 128 MB)          │  ◄── FastAPI Backend (Rule 09)
├──────────────────────────────────────────────────────────┤
│  quarkdock-redis (Limit: 256 MB / Reserv: 64 MB)         │  ◄── Session & Rate Limiting
├──────────────────────────────────────────────────────────┤
│  quarkdock-ui (Limit: 256 MB / Reserv: 64 MB)            │  ◄── React 19 / Nginx Static
├──────────────────────────────────────────────────────────┤
│  quarkdock-otel (Limit: 128 MB / Reserv: 64 MB)          │  ◄── OpenTelemetry Collector
├──────────────────────────────────────────────────────────┤
│  Linux Kernel & OS VM Buffer (~400 - 600 MB)             │
├──────────────────────────────────────────────────────────┤
│  Available Dynamic Headroom (~3.0 - 4.5 GB)              │  ◄── Prevents OOM under burst
└──────────────────────────────────────────────────────────┘
```

---

## 🔬 Apple Silicon Inference Reality: Metal vs CPU inside Docker

> [!IMPORTANT]
> **Why CPU allocation matters inside Docker on macOS**:
> Docker Desktop for Mac runs Linux inside a hypervisor. Apple's proprietary **Metal GPU framework is NOT natively virtualized into Linux containers**.
> Therefore, when Ollama runs inside a Docker container on macOS:
> - Inference executes on the **ARM64 CPU using Apple's high-throughput NEON vector extensions**.
> - Memory bandwidth between the Unified Memory and CPU cores is extraordinary (~150+ GB/s on M5 Pro), but CPU core count directly dictates matrix multiplication throughput.
> - At 6 CPUs: ~10 tokens/sec.
> - At 12–14 CPUs: ~20–25+ tokens/sec.
>
> **Host App Dual-Mode**:
> For maximum GPU acceleration, external host applications (like OpenClaw Desktop or Bionics) can optionally target a native macOS Ollama installation using Metal on port `11434` when container isolation is not required. However, for a 100% self-contained containerized stack, 12–14 CPUs allocated to Docker ensures high performance.

---

## 🛠️ Automated Health Verification

Run the built-in diagnostic at any time to verify system adequacy:

```bash
make doctor
```

The doctor command validates:
- [x] Docker daemon operational status
- [x] Docker VM allocated RAM (warns if < 10 GB)
- [x] Docker VM allocated CPUs (warns if < 8 cores)
- [x] Host port availability (`11434`, `8000`, `3000`, `3001`, `5432`, `6379`)
- [x] No port collisions with host daemons
