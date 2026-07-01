from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class SkillManifest:
    id: str
    path: Path
    version: str = "1.0.0"
    schemas: dict[str, str] = field(default_factory=dict)
    execution_modes: list[str] = field(default_factory=lambda: ["auto"])


def load_json_object(path: Path | None) -> dict[str, Any] | None:
    if path is None or not path.exists() or not path.is_file():
        return None
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError, TypeError, ValueError):
        return None
    return payload if isinstance(payload, dict) else None


def resolve_schema_path(skill: SkillManifest, schema_key: str) -> Path | None:
    raw = skill.schemas.get(schema_key) or f"assets/{schema_key}.schema.json"
    rel = str(raw).strip()
    if not rel:
        return None
    candidate = Path(rel)
    if candidate.is_absolute():
        return None
    root = skill.path.resolve()
    path = (root / candidate).resolve()
    try:
        path.relative_to(root)
    except ValueError:
        return None
    return path if path.exists() and path.is_file() else None


def load_schema(skill: SkillManifest, schema_key: str) -> dict[str, Any] | None:
    return load_json_object(resolve_schema_path(skill, schema_key))


def load_skill_manifest(skill_dir: Path) -> SkillManifest:
    root = skill_dir.resolve()
    runner = load_json_object(root / "assets" / "runner.json") or {}
    skill_id = str(runner.get("id") or root.name).strip() or root.name
    version = str(runner.get("version") or "1.0.0").strip() or "1.0.0"
    schemas_raw = runner.get("schemas")
    schemas = {
        str(key): str(value)
        for key, value in (
            schemas_raw.items() if isinstance(schemas_raw, dict) else []
        )
        if isinstance(key, str) and isinstance(value, str)
    }
    modes_raw = runner.get("execution_modes")
    execution_modes = [
        str(item).strip()
        for item in (modes_raw if isinstance(modes_raw, list) else [])
        if isinstance(item, str) and str(item).strip()
    ] or ["auto"]
    return SkillManifest(
        id=skill_id,
        path=root,
        version=version,
        schemas=schemas,
        execution_modes=execution_modes,
    )

