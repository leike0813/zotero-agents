from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .artifact import resolve_output_artifact_paths
from .bundle import RunBundleService
from .layout import RunWorkspaceLayout
from .schema import run_output_schema_service
from .skill import SkillManifest


def finalize_output(
    *,
    skill: SkillManifest,
    workspace_dir: Path,
    namespace: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    layout = RunWorkspaceLayout(
        workspace_id=workspace_dir.name,
        workspace_dir=workspace_dir,
        namespace=namespace,
    )
    output_data, done = run_output_schema_service.strip_done_marker(payload)
    errors = run_output_schema_service.validate_output(
        skill=skill, output_data=output_data
    )
    if not done:
        errors.append("__SKILL_DONE__ must be true")
    if errors:
        return {"ok": False, "errors": errors}
    artifact_result = resolve_output_artifact_paths(
        skill=skill,
        run_dir=workspace_dir,
        output_data=output_data,
    )
    if artifact_result.missing_required_fields or artifact_result.assembly_errors:
        errors = []
        if artifact_result.missing_required_fields:
            errors.append(
                "Missing required artifacts: "
                + ", ".join(artifact_result.missing_required_fields)
            )
        errors.extend(artifact_result.assembly_errors)
        return {
            "ok": False,
            "errors": errors,
            "warnings": artifact_result.warnings,
        }
    result_payload = dict(artifact_result.output_data)
    result_payload["artifacts"] = artifact_result.artifacts
    layout.result_path.parent.mkdir(parents=True, exist_ok=True)
    layout.result_path.write_text(
        json.dumps(result_payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    bundle_relpath = RunBundleService().build_run_bundle(
        workspace_dir,
        debug=False,
        layout=layout,
    )
    return {
        "ok": True,
        "namespace": namespace,
        "resultJsonPath": layout.result_path.as_posix(),
        "bundlePath": (workspace_dir / bundle_relpath).as_posix(),
        "bundleRelpath": bundle_relpath,
        "warnings": artifact_result.warnings,
        "artifacts": artifact_result.artifacts,
    }

