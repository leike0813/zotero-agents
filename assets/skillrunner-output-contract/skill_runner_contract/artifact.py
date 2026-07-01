from __future__ import annotations

import json
import shutil
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from typing import Any

from .skill import SkillManifest, load_schema


WARNING_OUTPUT_ARTIFACT_PATH_REWRITTEN = "OUTPUT_ARTIFACT_PATH_REWRITTEN"
WARNING_OUTPUT_ARTIFACT_MOVED_INSIDE_RUN_DIR = "OUTPUT_ARTIFACT_MOVED_INSIDE_RUN_DIR"
WARNING_OUTPUT_ARTIFACT_PATH_INVALID = "OUTPUT_ARTIFACT_PATH_INVALID"
WARNING_OUTPUT_ARTIFACT_PATH_MISSING = "OUTPUT_ARTIFACT_PATH_MISSING"
WARNING_OUTPUT_ARTIFACT_MANIFEST_PATH_REWRITTEN = (
    "OUTPUT_ARTIFACT_MANIFEST_PATH_REWRITTEN"
)
BUNDLE_ASSEMBLY_ARTIFACT_PATH_INVALID = "BUNDLE_ASSEMBLY_ARTIFACT_PATH_INVALID"
BUNDLE_ASSEMBLY_ARTIFACT_PATH_MISSING = "BUNDLE_ASSEMBLY_ARTIFACT_PATH_MISSING"
BUNDLE_ASSEMBLY_MANIFEST_JSON_INVALID = "BUNDLE_ASSEMBLY_MANIFEST_JSON_INVALID"
BUNDLE_ASSEMBLY_MANIFEST_NOT_FLAT_OBJECT = "BUNDLE_ASSEMBLY_MANIFEST_NOT_FLAT_OBJECT"
BUNDLE_ASSEMBLY_MANIFEST_VALUE_NOT_PATH = "BUNDLE_ASSEMBLY_MANIFEST_VALUE_NOT_PATH"
ARTIFACT_MANIFEST_TYPE = "artifact-manifest"


@dataclass(frozen=True)
class ArtifactResolutionResult:
    output_data: dict[str, Any]
    artifacts: list[str]
    warnings: list[str]
    missing_required_fields: list[str]
    assembly_errors: list[str]


@dataclass(frozen=True)
class _ArtifactField:
    name: str
    required: bool
    x_type: str
    role: str | None


def resolve_output_artifact_paths(
    *,
    skill: SkillManifest,
    run_dir: Path,
    output_data: dict[str, Any],
) -> ArtifactResolutionResult:
    updated = dict(output_data)
    warnings: list[str] = []
    artifacts: list[str] = []
    missing: list[str] = []
    errors: list[str] = []
    root = run_dir.resolve()

    for field in _load_output_artifact_fields(skill, output_data=updated):
        raw = updated.get(field.name)
        if not isinstance(raw, str) or not raw.strip():
            if field.required:
                missing.append(field.name)
            continue
        try:
            source_path = _resolve_run_local_path(run_dir=run_dir, raw_path=raw)
        except ValueError:
            _append_unique(warnings, WARNING_OUTPUT_ARTIFACT_PATH_INVALID)
            if field.required:
                missing.append(field.name)
            continue
        if not source_path.exists() or not source_path.is_file():
            _append_unique(warnings, WARNING_OUTPUT_ARTIFACT_PATH_MISSING)
            if field.required:
                missing.append(field.name)
            continue
        resolved = source_path.resolve()
        if not _is_relative_to(resolved, root):
            target = run_dir / "artifacts" / field.name / resolved.name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(resolved), str(target))
            resolved = target.resolve()
            _append_unique(warnings, WARNING_OUTPUT_ARTIFACT_MOVED_INSIDE_RUN_DIR)
        rel = resolved.relative_to(root).as_posix()
        if updated.get(field.name) != rel:
            updated[field.name] = rel
            _append_unique(warnings, WARNING_OUTPUT_ARTIFACT_PATH_REWRITTEN)
        artifacts.append(rel)
        if field.x_type == ARTIFACT_MANIFEST_TYPE:
            manifest = _expand_artifact_manifest(
                run_dir=run_dir, manifest_path=resolved
            )
            for code in manifest["warnings"]:
                _append_unique(warnings, code)
            errors.extend(manifest["errors"])
            artifacts.extend(manifest["artifacts"])

    return ArtifactResolutionResult(
        output_data=updated,
        artifacts=sorted(dict.fromkeys(artifacts)),
        warnings=warnings,
        missing_required_fields=missing,
        assembly_errors=errors,
    )


def _load_output_artifact_fields(
    skill: SkillManifest,
    *,
    output_data: dict[str, Any],
) -> list[_ArtifactField]:
    schema = load_schema(skill, "output")
    if not isinstance(schema, dict):
        return []
    fields: list[_ArtifactField] = []
    _collect_fields(schema=schema, output_data=output_data, fields=fields)
    merged: dict[str, _ArtifactField] = {}
    for field in fields:
        existing = merged.get(field.name)
        if existing is None:
            merged[field.name] = field
        else:
            merged[field.name] = _ArtifactField(
                name=field.name,
                required=existing.required or field.required,
                x_type=(
                    existing.x_type
                    if existing.x_type == ARTIFACT_MANIFEST_TYPE
                    else field.x_type
                ),
                role=existing.role or field.role,
            )
    return list(merged.values())


def _collect_fields(
    *, schema: dict[str, Any], output_data: dict[str, Any], fields: list[_ArtifactField]
) -> None:
    properties = schema.get("properties")
    required = {item for item in schema.get("required", []) if isinstance(item, str)}
    if isinstance(properties, dict):
        for name, prop in properties.items():
            if not isinstance(name, str) or not isinstance(prop, dict):
                continue
            x_type = str(prop.get("x-type") or "").strip().lower()
            if x_type not in {"artifact", "file", ARTIFACT_MANIFEST_TYPE}:
                continue
            role = prop.get("x-role") if isinstance(prop.get("x-role"), str) else None
            fields.append(
                _ArtifactField(
                    name=name, required=name in required, x_type=x_type, role=role
                )
            )
    for child in _schema_list(schema.get("allOf")):
        _collect_fields(schema=child, output_data=output_data, fields=fields)
    for key in ("oneOf", "anyOf"):
        children = _schema_list(schema.get(key))
        matching = [child for child in children if _branch_matches(child, output_data)]
        for child in matching or children:
            _collect_fields(schema=child, output_data=output_data, fields=fields)


def _schema_list(raw: Any) -> list[dict[str, Any]]:
    return [item for item in raw if isinstance(item, dict)] if isinstance(raw, list) else []


def _branch_matches(schema: dict[str, Any], output_data: dict[str, Any]) -> bool:
    properties = schema.get("properties")
    if not isinstance(properties, dict):
        return True
    discriminators = 0
    for name, prop in properties.items():
        if not isinstance(name, str) or not isinstance(prop, dict) or name not in output_data:
            continue
        value = output_data.get(name)
        if "const" in prop:
            discriminators += 1
            if value != prop.get("const"):
                return False
        enum = prop.get("enum")
        if isinstance(enum, list):
            discriminators += 1
            if value not in enum:
                return False
    return discriminators > 0


def _expand_artifact_manifest(*, run_dir: Path, manifest_path: Path) -> dict[str, list[str]]:
    warnings: list[str] = []
    errors: list[str] = []
    artifacts: list[str] = []
    try:
        payload = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError, TypeError, ValueError) as exc:
        return {
            "warnings": [BUNDLE_ASSEMBLY_MANIFEST_JSON_INVALID],
            "errors": [f"{BUNDLE_ASSEMBLY_MANIFEST_JSON_INVALID}: {exc}"],
            "artifacts": [],
        }
    if not isinstance(payload, dict):
        return {
            "warnings": [BUNDLE_ASSEMBLY_MANIFEST_NOT_FLAT_OBJECT],
            "errors": [BUNDLE_ASSEMBLY_MANIFEST_NOT_FLAT_OBJECT],
            "artifacts": [],
        }
    root = run_dir.resolve()
    updated: dict[str, str] = {}
    changed = False
    for key, raw_path in payload.items():
        if not isinstance(raw_path, str) or not raw_path.strip():
            _append_unique(warnings, BUNDLE_ASSEMBLY_MANIFEST_VALUE_NOT_PATH)
            errors.append(f"{BUNDLE_ASSEMBLY_MANIFEST_VALUE_NOT_PATH}: {key}")
            continue
        try:
            path = _resolve_run_local_path(run_dir=run_dir, raw_path=raw_path)
        except ValueError:
            _append_unique(warnings, BUNDLE_ASSEMBLY_ARTIFACT_PATH_INVALID)
            errors.append(f"{BUNDLE_ASSEMBLY_ARTIFACT_PATH_INVALID}: {key}")
            continue
        if not _is_relative_to(path.resolve(), root):
            _append_unique(warnings, BUNDLE_ASSEMBLY_ARTIFACT_PATH_INVALID)
            errors.append(f"{BUNDLE_ASSEMBLY_ARTIFACT_PATH_INVALID}: {key}")
            continue
        if not path.exists() or not path.is_file():
            _append_unique(warnings, BUNDLE_ASSEMBLY_ARTIFACT_PATH_MISSING)
            errors.append(f"{BUNDLE_ASSEMBLY_ARTIFACT_PATH_MISSING}: {key}")
            continue
        rel = path.resolve().relative_to(root).as_posix()
        updated[str(key)] = rel
        artifacts.append(rel)
        if raw_path != rel:
            changed = True
    if changed and not errors:
        manifest_path.write_text(
            json.dumps(updated, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        _append_unique(warnings, WARNING_OUTPUT_ARTIFACT_MANIFEST_PATH_REWRITTEN)
    return {"warnings": warnings, "errors": errors, "artifacts": sorted(dict.fromkeys(artifacts))}


def _resolve_run_local_path(*, run_dir: Path, raw_path: str) -> Path:
    candidate = Path(raw_path.strip())
    if candidate.is_absolute():
        return candidate.resolve()
    normalized = PurePosixPath(raw_path.strip().replace("\\", "/"))
    if normalized.is_absolute() or any(part in {"", ".", ".."} for part in normalized.parts):
        raise ValueError("invalid path")
    return (run_dir / normalized.as_posix()).resolve()


def _is_relative_to(path: Path, parent: Path) -> bool:
    try:
        path.relative_to(parent)
    except ValueError:
        return False
    return True


def _append_unique(values: list[str], code: str) -> None:
    if code not in values:
        values.append(code)

