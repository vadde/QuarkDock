from __future__ import annotations

import orjson
from src.core.events import format_sse_event


def test_format_sse_event_string():
    """Verify raw string data formatting."""
    event = format_sse_event("test_event", "hello world")
    assert event == "event: test_event\ndata: hello world\n\n"


def test_format_sse_event_dict():
    """Verify dictionary serialization with orjson."""
    data = {"key": "value", "count": 42}
    event = format_sse_event("metric", data)
    assert event.startswith("event: metric\ndata: ")
    assert event.endswith("\n\n")

    # Extract JSON part
    lines = event.strip().split("\n")
    assert lines[0] == "event: metric"
    data_json = lines[1].removeprefix("data: ")
    parsed = orjson.loads(data_json)
    assert parsed == {"key": "value", "count": 42}
