# ==============================================================================
# Multi-Stage Dockerfile for QuarkDock Evaluation Worker
# Python 3.12 (Rule 09 Compliant)
# ==============================================================================

# --- Stage 1: Build & Dependencies ---
FROM python:3.12-slim AS builder

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml README.md ./
RUN pip install --no-cache-dir --upgrade pip setuptools wheel \
    && pip install --no-cache-dir --prefix=/install --ignore-installed .

# --- Stage 2: Minimal Production Runtime ---
FROM python:3.12-slim AS runtime

WORKDIR /app

# Performance & Memory Optimization Environment Variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONOPTIMIZE=2 \
    PYTHONPATH=/app

# Create persistent state directory for SQLite watermark DB
RUN mkdir -p /data

# Copy pre-built dependencies from builder
COPY --from=builder /install /usr/local

# Copy application source code
COPY src /app/src

CMD ["python", "-m", "src.main"]
