from __future__ import annotations

import argparse
import json
import sys
import zipfile
from pathlib import Path
from typing import Any

from .bundle import BundleAssemblyError
from .finalize import finalize_output
from .layout import RunWorkspaceLayout
from .schema import run_output_schema_service
from .skill import load_skill_manifest


def _read_payload(value: str) -> dict[str, Any]:
    path = Path(value)
    if path.exists() and path.is_file():
        raw = path.read_text(encoding="utf-8")
    else:
        raw = value
    payload = json.loads(raw)
    if not isinstance(payload, dict):
        raise ValueError("payload must be a JSON object")
    return payload


def _write_json(payload: dict[str, Any]) -> None:
    sys.stdout.write(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")


def _validate_bundle_path(bundle: Path) -> list[str]:
    errors: list[str] = []
    if bundle.is_dir():
        for path in bundle.rglob("*"):
            if not path.is_file():
                continue
            rel = path.relative_to(bundle).as_posix()
            if rel.startswith("/") or any(
                part in {"", ".", ".."} for part in rel.split("/")
            ):
                errors.append(f"unsafe bundle entry: {rel}")
        return errors
    if zipfile.is_zipfile(bundle):
        with zipfile.ZipFile(bundle, "r") as zf:
            for name in zf.namelist():
                normalized = name.replace("\\", "/")
                if normalized.startswith("/") or any(
                    part in {"", ".", ".."} for part in normalized.split("/") if part
                ):
                    errors.append(f"unsafe bundle entry: {name}")
        return errors
    return [f"bundle not found or unsupported: {bundle}"]


def cmd_materialize_schema(args: argparse.Namespace) -> int:
    skill = load_skill_manifest(Path(args.skill_dir))
    workspace = Path(args.workspace_dir).resolve()
    layout = RunWorkspaceLayout(
        workspace_id=workspace.name,
        workspace_dir=workspace,
        namespace=args.namespace,
    )
    layout.input_manifest_path.parent.mkdir(parents=True, exist_ok=True)
    if not layout.input_manifest_path.exists():
        layout.input_manifest_path.write_text("{}", encoding="utf-8")
    result = run_output_schema_service.materialize(
        skill=skill,
        execution_mode=args.execution_mode,
        run_dir=workspace,
        audit_dir=layout.audit_dir,
        input_manifest_path=layout.input_manifest_path,
    )
    _write_json(
        {
            "ok": result.schema_path is not None,
            "schemaPath": result.schema_path.as_posix()
            if result.schema_path
            else None,
            "schemaRelpath": result.schema_relpath,
        }
    )
    return 0 if result.schema_path is not None else 1


def cmd_finalize_output(args: argparse.Namespace) -> int:
    skill = load_skill_manifest(Path(args.skill_dir))
    payload = _read_payload(args.payload)
    try:
        result = finalize_output(
            skill=skill,
            workspace_dir=Path(args.workspace_dir).resolve(),
            namespace=args.namespace,
            payload=payload,
        )
    except BundleAssemblyError as exc:
        result = {
            "ok": False,
            "errors": [f"{exc.code}: {exc}"],
            "path": exc.path,
        }
    _write_json(result)
    return 0 if result.get("ok") is True else 1


def cmd_validate_bundle(args: argparse.Namespace) -> int:
    errors = _validate_bundle_path(Path(args.bundle))
    _write_json({"ok": not errors, "errors": errors})
    return 0 if not errors else 1


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="skill-runner-contract")
    sub = parser.add_subparsers(dest="command", required=True)

    materialize = sub.add_parser("materialize-schema")
    materialize.add_argument("--skill-dir", required=True)
    materialize.add_argument("--workspace-dir", required=True)
    materialize.add_argument("--namespace", required=True)
    materialize.add_argument("--execution-mode", default="auto")
    materialize.set_defaults(func=cmd_materialize_schema)

    finalize = sub.add_parser("finalize-output")
    finalize.add_argument("--skill-dir", required=True)
    finalize.add_argument("--workspace-dir", required=True)
    finalize.add_argument("--namespace", required=True)
    finalize.add_argument("--payload", required=True)
    finalize.set_defaults(func=cmd_finalize_output)

    validate = sub.add_parser("validate-bundle")
    validate.add_argument("--skill-dir", required=True)
    validate.add_argument("--workspace-dir", required=True)
    validate.add_argument("--namespace", required=True)
    validate.add_argument("--bundle", required=True)
    validate.set_defaults(func=cmd_validate_bundle)
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        return int(args.func(args))
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        _write_json({"ok": False, "errors": [str(exc)]})
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

