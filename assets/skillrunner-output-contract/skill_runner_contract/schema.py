from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass
import json
from pathlib import Path
from typing import Any

import jsonschema  # type: ignore[import-untyped]

from .skill import SkillManifest, load_schema


TARGET_OUTPUT_SCHEMA_RELPATH = ".audit/contracts/target_output_schema.json"
RUN_OPTION_TARGET_OUTPUT_SCHEMA_RELPATH = "__target_output_schema_relpath"


@dataclass(frozen=True)
class RunOutputSchemaMaterialization:
    business_schema: dict[str, Any] | None
    machine_schema: dict[str, Any] | None
    schema_path: Path | None
    schema_relpath: str | None


class RunOutputSchemaService:
    def materialize(
        self,
        *,
        skill: SkillManifest,
        execution_mode: str,
        run_dir: Path,
        audit_dir: Path,
        input_manifest_path: Path | None = None,
    ) -> RunOutputSchemaMaterialization:
        business_schema = load_schema(skill, "output")
        if business_schema is None:
            return RunOutputSchemaMaterialization(None, None, None, None)
        final_schema = self.build_final_wrapper_schema(business_schema)
        machine_schema = (
            self.build_interactive_union_schema(final_schema)
            if self._normalize_execution_mode(execution_mode) == "interactive"
            else final_schema
        )
        schema_path = audit_dir / "contracts" / "target_output_schema.json"
        schema_path.parent.mkdir(parents=True, exist_ok=True)
        schema_relpath = schema_path.relative_to(run_dir).as_posix()
        self._write_json_atomic(schema_path, machine_schema)
        if input_manifest_path is not None:
            self._append_input_manifest_field(
                input_manifest_path,
                {"target_output_schema_path_first_attempt": schema_relpath},
            )
        return RunOutputSchemaMaterialization(
            business_schema=business_schema,
            machine_schema=machine_schema,
            schema_path=schema_path,
            schema_relpath=schema_relpath,
        )

    def build_final_wrapper_schema(
        self, business_schema: dict[str, Any]
    ) -> dict[str, Any]:
        base_schema = deepcopy(business_schema)
        if base_schema.get("type") != "object":
            base_schema = {
                "type": "object",
                "properties": {"result": deepcopy(business_schema)},
                "required": ["result"],
                "additionalProperties": False,
            }
        done_schema = {
            "type": "boolean",
            "const": True,
            "description": "Completion signal. Must be true in the final payload.",
        }
        base_schema = self._inject_done_marker_into_union_branches(
            base_schema, done_schema
        )
        properties = (
            base_schema.get("properties")
            if isinstance(base_schema.get("properties"), dict)
            else {}
        )
        base_schema["type"] = "object"
        base_schema["properties"] = {
            "__SKILL_DONE__": done_schema,
            **deepcopy(properties),
        }
        required = [
            item for item in base_schema.get("required", []) if isinstance(item, str)
        ]
        base_schema["required"] = [
            "__SKILL_DONE__",
            *[item for item in required if item != "__SKILL_DONE__"],
        ]
        return base_schema

    def build_interactive_union_schema(
        self, final_schema: dict[str, Any]
    ) -> dict[str, Any]:
        return {
            "$schema": "https://json-schema.org/draft/2020-12/schema",
            "title": "Skill Runner Interactive Output Contract",
            "oneOf": [
                deepcopy(final_schema),
                {
                    "type": "object",
                    "required": ["__SKILL_DONE__", "message", "ui_hints"],
                    "properties": {
                        "__SKILL_DONE__": {
                            "type": "boolean",
                            "const": False,
                            "description": "Pending-turn marker. Must be false when waiting for user input.",
                        },
                        "message": {"type": "string", "minLength": 1},
                        "ui_hints": {"type": "object"},
                    },
                    "additionalProperties": True,
                },
            ],
        }

    def validate_output(
        self, *, skill: SkillManifest, output_data: dict[str, Any]
    ) -> list[str]:
        schema = load_schema(skill, "output")
        if not isinstance(schema, dict):
            return ["Output schema file missing: output"]
        try:
            jsonschema.validate(instance=output_data, schema=schema)
            return []
        except jsonschema.ValidationError as exc:
            path = "/".join(str(item) for item in exc.path)
            return [f"Output validation error: {exc.message} (Path: {path})"]
        except (jsonschema.SchemaError, TypeError, ValueError) as exc:
            return [f"Output schema validation failed: {str(exc)}"]

    def strip_done_marker(self, payload: dict[str, Any]) -> tuple[dict[str, Any], bool]:
        output = dict(payload)
        done = output.pop("__SKILL_DONE__", None) is True
        return output, done

    def _inject_done_marker_into_union_branches(
        self,
        schema: dict[str, Any],
        done_schema: dict[str, Any],
    ) -> dict[str, Any]:
        updated = deepcopy(schema)
        for key in ("oneOf", "anyOf"):
            branches = updated.get(key)
            if not isinstance(branches, list):
                continue
            next_branches: list[Any] = []
            for branch in branches:
                if not isinstance(branch, dict):
                    next_branches.append(branch)
                    continue
                branch_copy = deepcopy(branch)
                properties = (
                    branch_copy.get("properties")
                    if isinstance(branch_copy.get("properties"), dict)
                    else {}
                )
                if branch_copy.get("type") != "object" and not properties:
                    next_branches.append(branch_copy)
                    continue
                branch_copy["type"] = "object"
                branch_copy["properties"] = {
                    "__SKILL_DONE__": deepcopy(done_schema),
                    **properties,
                }
                required = [
                    item
                    for item in branch_copy.get("required", [])
                    if isinstance(item, str)
                ]
                branch_copy["required"] = [
                    "__SKILL_DONE__",
                    *[item for item in required if item != "__SKILL_DONE__"],
                ]
                next_branches.append(branch_copy)
            updated[key] = next_branches
        return updated

    def _normalize_execution_mode(self, execution_mode: str) -> str:
        normalized = (execution_mode or "auto").strip().lower()
        return normalized if normalized in {"auto", "interactive"} else "auto"

    def _append_input_manifest_field(self, path: Path, fields: dict[str, Any]) -> None:
        if not path.exists():
            return
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, UnicodeDecodeError, json.JSONDecodeError, TypeError, ValueError):
            return
        if not isinstance(payload, dict):
            return
        payload.update(fields)
        self._write_json_atomic(path, payload)

    def _write_json_atomic(self, path: Path, payload: dict[str, Any]) -> None:
        temp = path.with_name(f"{path.name}.tmp")
        temp.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        temp.replace(path)


run_output_schema_service = RunOutputSchemaService()

