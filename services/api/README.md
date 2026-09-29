# QuarkDock API Engine

High-efficiency asynchronous Python 3.12 backend orchestrating local LLM inference via Ollama and full-lifecycle observability via Langfuse.

## Features
- Server-Sent Events (SSE) streaming with immediate client-disconnect cancellation.
- Connection pooling for Ollama and Langfuse.
- Strict Rule 09 Python Efficiency Manifesto compliance (`__slots__`, `uvloop`, `orjson`, zero-copy generators).
