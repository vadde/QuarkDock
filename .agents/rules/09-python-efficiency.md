# Rule 09: Python Performance & Memory Efficiency Manifesto

> **Priority**: 🔴 Critical — Every bit and byte matters. No lazy allocations, no wasteful patterns.
> **Scope**: All Python code in QuarkDock (`services/api/`, `scripts/`, `eval/`, `tests/`)

---

## The Efficiency Commandments

1. **Never allocate what you can generate** — Generators over lists, always.
2. **Never copy what you can reference** — Views, slices, memoryview over copies.
3. **Never hold what you can release** — Context managers, `del`, weak references.
4. **Never block what you can stream** — Async generators for all I/O-bound flows.
5. **Never recompute what you can cache** — `lru_cache`, `@cached_property`, pre-computation.
6. **Never guess what you can measure** — Profile before optimizing, but enforce patterns upfront.

---

## 1. Memory Efficiency Patterns

### 1.1 Use `__slots__` on All Internal Classes

```python
# ❌ PROHIBITED — Each instance wastes ~200 bytes on __dict__
class ChatMessage:
    def __init__(self, role: str, content: str, timestamp: float):
        self.role = role
        self.content = content
        self.timestamp = timestamp

# ✅ MANDATORY — ~60% less memory per instance
class ChatMessage:
    __slots__ = ("role", "content", "timestamp")

    def __init__(self, role: str, content: str, timestamp: float) -> None:
        self.role = role
        self.content = content
        self.timestamp = timestamp
```

> **Exception**: Pydantic models (they manage their own memory). Internal dataclasses and value objects MUST use `__slots__=True` or `@dataclass(slots=True)`.

### 1.2 Generators Over Lists — No Exceptions

```python
# ❌ PROHIBITED — Materializes entire list in memory
def get_all_traces(traces: list[dict]) -> list[str]:
    return [t["id"] for t in traces if t["status"] == "active"]

# ✅ MANDATORY — Lazy evaluation, O(1) memory
def get_all_traces(traces: Iterable[dict]) -> Iterator[str]:
    return (t["id"] for t in traces if t["status"] == "active")

# ✅ When you NEED a list, document why
def get_all_traces_sorted(traces: Iterable[dict]) -> list[str]:
    """Materialize required: sorted() needs random access."""
    return sorted(t["id"] for t in traces if t["status"] == "active")
```

### 1.3 Streaming Responses — Never Buffer Full Response

```python
# ❌ PROHIBITED — Buffers entire LLM response in memory
async def chat(prompt: str) -> str:
    chunks = []
    async for chunk in ollama_stream(prompt):
        chunks.append(chunk)
    return "".join(chunks)

# ✅ MANDATORY — Stream directly to client, O(1) memory
async def chat(prompt: str) -> AsyncIterator[str]:
    async for chunk in ollama_stream(prompt):
        yield chunk
```

### 1.4 `memoryview` for Binary Data

```python
# ❌ PROHIBITED — Creates copies on slicing
data = b"large binary payload..."
header = data[:64]  # Copy!

# ✅ MANDATORY for binary processing — Zero-copy slicing
data = b"large binary payload..."
view = memoryview(data)
header = view[:64]  # No copy, shared buffer
```

### 1.5 Dataclasses with `slots=True`

```python
from dataclasses import dataclass

# ❌ PROHIBITED
@dataclass
class ModelConfig:
    name: str
    temperature: float
    max_tokens: int

# ✅ MANDATORY — 40-60% less memory, faster attribute access
@dataclass(slots=True, frozen=True)
class ModelConfig:
    name: str
    temperature: float
    max_tokens: int
```

### 1.6 Weak References for Caches & Callbacks

```python
import weakref

# ❌ PROHIBITED — Holds strong reference, prevents GC
class SessionManager:
    def __init__(self) -> None:
        self._sessions: dict[str, Session] = {}

# ✅ PREFERRED — Allows GC when no other references exist
class SessionManager:
    __slots__ = ("_sessions",)

    def __init__(self) -> None:
        self._sessions: weakref.WeakValueDictionary[str, Session] = (
            weakref.WeakValueDictionary()
        )
```

---

## 2. Async & I/O Efficiency

### 2.1 Connection Pooling — Never Create Connections Per-Request

```python
import httpx

# ❌ PROHIBITED — New TCP connection + TLS handshake per request
async def call_ollama(prompt: str) -> str:
    async with httpx.AsyncClient() as client:
        resp = await client.post(OLLAMA_URL, json={"prompt": prompt})
        return resp.text

# ✅ MANDATORY — Shared pool, connection reuse, keep-alive
class OllamaClient:
    __slots__ = ("_client",)

    def __init__(self) -> None:
        self._client = httpx.AsyncClient(
            base_url=OLLAMA_URL,
            timeout=httpx.Timeout(connect=5.0, read=120.0, write=10.0, pool=5.0),
            limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
            http2=True,
        )

    async def close(self) -> None:
        await self._client.aclose()
```

### 2.2 Async Context Managers for Resource Lifecycle

```python
from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

# ✅ MANDATORY — Lifespan management for FastAPI
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    # Startup: initialize shared resources ONCE
    app.state.ollama = OllamaClient()
    app.state.langfuse = LangfuseClient()
    try:
        yield
    finally:
        # Shutdown: clean release, no leaks
        await app.state.ollama.close()
        await app.state.langfuse.flush()
        await app.state.langfuse.close()
```

### 2.3 Bounded Concurrency — Never Unbounded `gather()`

```python
import asyncio

# ❌ PROHIBITED — Can spawn 10,000 concurrent requests, OOM risk
results = await asyncio.gather(*(fetch(url) for url in urls))

# ✅ MANDATORY — Bounded semaphore limits concurrency
SEM = asyncio.Semaphore(10)

async def bounded_fetch(url: str) -> bytes:
    async with SEM:
        return await fetch(url)

results = await asyncio.gather(*(bounded_fetch(url) for url in urls))
```

---

## 3. Data Structure Selection

| Need | ❌ Don't Use | ✅ Use | Why |
|------|-------------|--------|-----|
| FIFO queue | `list` (pop(0) is O(n)) | `collections.deque` | O(1) append/popleft |
| Immutable set | `set` | `frozenset` | Hashable, no accidental mutation |
| Numeric arrays | `list[float]` | `array.array('d', ...)` | 8x less memory than list of floats |
| Binary packing | Manual string concat | `struct.pack` / `struct.unpack` | Zero-copy, C-speed |
| Lookup table | `list` + linear scan | `dict` / `set` | O(1) vs O(n) lookup |
| Sorted insertion | `list.append` + `sort()` | `bisect.insort` | O(log n) vs O(n log n) |
| String building | `+=` in loop | `"".join(parts)` | O(n) vs O(n²) |
| Counting | Manual `dict` increment | `collections.Counter` | C-optimized, batteries-included |
| Default dicts | `if key not in d` pattern | `collections.defaultdict` | Cleaner, slightly faster |

---

## 4. Serialization Efficiency

### 4.1 Pydantic v2 Best Practices

```python
from pydantic import BaseModel

# ✅ Use model_validate (not deprecated parse_obj)
msg = ChatMessage.model_validate(raw_data)

# ✅ Use model_dump with mode="json" for serialization
output = msg.model_dump(mode="json", exclude_none=True)

# ✅ Use model_validate_json for direct JSON→Model (skips dict intermediate)
msg = ChatMessage.model_validate_json(raw_json_bytes)
```

### 4.2 Use `orjson` for JSON Performance

```python
# ❌ PROHIBITED — stdlib json is 5-10x slower
import json
data = json.dumps(payload)

# ✅ MANDATORY — orjson: Rust-backed, 5-10x faster, less memory
import orjson
data = orjson.dumps(payload)  # Returns bytes, not str
parsed = orjson.loads(raw_bytes)
```

---

## 5. Compute Efficiency

### 5.1 Cache Expensive Operations

```python
from functools import lru_cache, cached_property

# ✅ lru_cache for pure functions
@lru_cache(maxsize=128)
def parse_model_name(model_id: str) -> tuple[str, str]:
    """Parse 'qwen2.5:7b' → ('qwen2.5', '7b')."""
    parts = model_id.rsplit(":", 1)
    return (parts[0], parts[1] if len(parts) > 1 else "latest")

# ✅ cached_property for one-time expensive computations
class AppConfig:
    __slots__ = ("_raw", "__dict__")  # __dict__ needed for cached_property

    @cached_property
    def parsed_rules(self) -> dict[str, Any]:
        """Parse rules once, reuse forever."""
        return _expensive_parse(self._raw)
```

### 5.2 Use Set Operations for Membership Tests

```python
# ❌ PROHIBITED — O(n) per check
ALLOWED_MODELS = ["qwen2.5:7b", "gemma3:4b", "llama3.2:8b"]
if model in ALLOWED_MODELS: ...  # Linear scan!

# ✅ MANDATORY — O(1) per check
ALLOWED_MODELS: frozenset[str] = frozenset({
    "qwen2.5:7b", "gemma3:4b", "llama3.2:8b"
})
if model in ALLOWED_MODELS: ...  # Hash lookup
```

### 5.3 Avoid Repeated String Concatenation

```python
# ❌ PROHIBITED — O(n²) memory churn
result = ""
for chunk in chunks:
    result += chunk  # New string object EVERY iteration

# ✅ MANDATORY — O(n) single allocation
result = "".join(chunks)
```

---

## 6. Import & Module Hygiene

```python
# ❌ PROHIBITED — Imports everything, pollutes namespace, slows startup
from langfuse import *

# ❌ PROHIBITED — Imports heavy module at module load even if rarely used
import pandas as pd  # 300ms import time, 150MB memory

# ✅ MANDATORY — Lazy import for heavy/optional dependencies
def analyze_traces() -> None:
    """Only import pandas when actually needed."""
    import pandas as pd
    ...

# ✅ MANDATORY — TYPE_CHECKING guard for type-only imports
from __future__ import annotations
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from langfuse import Langfuse  # Zero runtime cost
```

---

## 7. GC & Object Lifecycle

```python
# ✅ Explicitly delete large temporaries
large_response = await fetch_large_dataset()
processed = transform(large_response)
del large_response  # Free memory immediately, don't wait for GC

# ✅ Use context managers for ALL resources
async with aiofiles.open(path, "rb") as f:
    async for line in f:
        yield process_line(line)
# File handle closed HERE, not "whenever GC runs"

# ✅ For batch processing, periodic GC hints
import gc
for i, batch in enumerate(chunked(data, 1000)):
    process_batch(batch)
    if i % 10 == 0:
        gc.collect()  # Nudge GC on batch boundaries
```

---

## 8. Docker & Runtime Optimization

```dockerfile
# ✅ Multi-stage build — minimal final image
FROM python:3.12-slim AS builder
WORKDIR /build
COPY pyproject.toml ./
RUN pip install --no-cache-dir --prefix=/install .

FROM python:3.12-slim AS runtime
COPY --from=builder /install /usr/local
# No pip, no build tools, no cache in final image

ENV PYTHONDONTWRITEBYTECODE=1    # No .pyc files (save disk I/O)
ENV PYTHONUNBUFFERED=1           # Direct stdout (no buffer delay)
ENV PYTHONOPTIMIZE=2             # Strip docstrings + asserts in prod
```

### Runtime: `uvloop` for Event Loop Performance

```python
# ✅ MANDATORY in production — 2-4x faster event loop (libuv-based)
# pyproject.toml: dependencies = ["uvloop>=0.21"]

# In main.py or uvicorn config:
import uvloop
uvloop.install()  # Replace default asyncio event loop
```

---

## Anti-Pattern Violation Table

| Violation | Severity | Detection |
|-----------|----------|-----------|
| `list` comprehension where generator suffices | 🔴 Critical | Ruff rule `C417` / Code review |
| Missing `__slots__` on internal class | 🟡 Important | Code review |
| `httpx.AsyncClient()` created per-request | 🔴 Critical | Code review |
| `json.dumps` instead of `orjson.dumps` | 🟡 Important | Ruff custom rule / grep |
| `str +=` in loop | 🔴 Critical | Ruff rule `PERF401` |
| `list` used for membership check (>5 items) | 🟡 Important | Code review |
| Unbounded `asyncio.gather()` | 🔴 Critical | Code review |
| Missing `TYPE_CHECKING` guard on heavy imports | 🟡 Important | Code review |
| Full response buffered before streaming | 🔴 Critical | Code review |
| No `uvloop` in production config | 🟡 Important | Dockerfile review |

---

## Enforcement Checklist (Every PR / Every Commit)

Before ANY Python code is committed:

- [ ] All internal classes use `__slots__` (or `dataclass(slots=True)`)
- [ ] All collection returns are generators/iterators unless materialization is documented
- [ ] All HTTP clients use connection pooling (shared `AsyncClient`)
- [ ] All streaming endpoints yield chunks — never buffer full response
- [ ] JSON operations use `orjson`, not `json`
- [ ] No `list` used for membership checks (use `set`/`frozenset`)
- [ ] No `str +=` in loops (use `"".join()`)
- [ ] Heavy imports are lazy or behind `TYPE_CHECKING`
- [ ] All resources use context managers (`async with`)
- [ ] Pydantic models use `model_validate_json()` for direct bytes→model
- [ ] `uvloop` installed and configured for production
- [ ] Docker image uses multi-stage build with `python:3.12-slim`
