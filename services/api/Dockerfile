# ==============================================================================
# Multi-Stage High-Efficiency Dockerfile for QuarkDock API
# Python 3.12 + FastAPI + uvloop (Rule 09 Compliant)
# ==============================================================================

# --- Stage 1: Build & Dependencies ---
FROM python:3.12-slim AS builder

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./
RUN pip install --no-cache-dir --upgrade pip setuptools wheel \
    && pip install --no-cache-dir --prefix=/install .

# --- Stage 2: Minimal Production Runtime ---
FROM python:3.12-slim AS runtime

WORKDIR /app

# Performance & Memory Optimization Environment Variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONOPTIMIZE=2 \
    PORT=8000 \
    HOST=0.0.0.0

# Copy pre-built dependencies from builder
COPY --from=builder /install /usr/local

# Copy application source code
COPY src /app/src

EXPOSE 8000

# Minimal zero-dependency health check
HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Start Uvicorn with uvloop and single high-concurrency async worker
CMD ["python", "-m", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--loop", "uvloop", "--http", "httptools", "--no-access-log"]
