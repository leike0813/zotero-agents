from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any


def read_json(path: str | Path) -> dict[str, Any]:
    target = Path(path)
    if not target.exists():
        return {}
    return json.loads(target.read_text(encoding="utf-8"))


def write_json(path: str | Path, payload: dict[str, Any]) -> None:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def read_state(path: str | Path) -> dict[str, Any]:
    state = read_json(path)
    if not state:
        state = {
            "schema_id": "writing.manuscript_literature_framing.runtime_state",
            "schema_version": "1.0.0",
            "status": "running",
            "events": [],
        }
    return state


def write_state(path: str | Path, state: dict[str, Any]) -> None:
    write_json(path, state)


def read_payload(path: str | Path) -> dict[str, Any]:
    payload = read_json(path)
    if not isinstance(payload, dict):
        raise ValueError("payload must be a JSON object")
    return payload


def append_event(state: dict[str, Any], action: str) -> None:
    events = state.setdefault("events", [])
    if isinstance(events, list):
        events.append({"action": action})


def stable_hash(value: Any) -> str:
    encoded = json.dumps(value, ensure_ascii=False, sort_keys=True).encode("utf-8")
    return "sha256:" + hashlib.sha256(encoded).hexdigest()


def write_text(path: str | Path, text: str) -> None:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(text, encoding="utf-8")


def ensure_object(value: Any, label: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ValueError(f"{label} must be an object")
    if not value:
        raise ValueError(f"{label} must not be empty")
    return value


def ensure_non_empty_string(value: Any, label: str) -> str:
    text = str(value or "").strip()
    if not text:
        raise ValueError(f"{label} is required")
    return text


def ensure_list(value: Any, label: str) -> list[Any]:
    if not isinstance(value, list):
        raise ValueError(f"{label} must be an array")
    return value


def normalize_string_list(value: Any, label: str) -> list[str]:
    items = [str(entry).strip() for entry in ensure_list(value, label) if str(entry).strip()]
    if not items:
        raise ValueError(f"{label} must contain at least one non-empty entry")
    return items
