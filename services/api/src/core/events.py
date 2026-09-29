from __future__ import annotations

from typing import Any
import orjson


def format_sse_event(event: str, data: dict[str, Any] | str) -> str:
    """Format a Server-Sent Event conforming to the W3C EventSource spec.

    Uses orjson for high-speed serialization (Rule 09 compliant).
    """
    if isinstance(data, dict):
        payload = orjson.dumps(data).decode("utf-8")
    else:
        payload = data

    return f"event: {event}\ndata: {payload}\n\n"
