from __future__ import annotations

from typing import Any
import orjson


def dumps_bytes(obj: Any) -> bytes:
    """Serialize object to fast UTF-8 JSON bytes via Rust orjson."""
    return orjson.dumps(obj)


def dumps_str(obj: Any) -> str:
    """Serialize object to fast UTF-8 JSON string via Rust orjson."""
    return orjson.dumps(obj).decode("utf-8")
