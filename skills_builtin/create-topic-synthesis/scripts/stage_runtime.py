"""Stage helpers and SQLite renderer for create-topic-synthesis.

Agents must resume from SQLite, execute only the gate-computed next action, and
treat partial/unregistered output as invalid. Render runs only at the final
stage and materializes result files from SQLite SSOT. No placeholder semantic
content is generated here. Failure states include failed_retryable,
failed_terminal, and canceled. Only registered final stdout is valid.
State-changing actions write deterministic action receipts for idempotent retry.
persist_cross_paper_synthesis fails on source_context_hash mismatch.
render validates paper_evidence digest_ref payload_hash against SQLite bundles.
render validates evidence_refs against paper_evidence.id and external_literature_analysis.summary.
persist_paper_analysis validates one-paper analysis against the Stage 4 artifact bundle receipt.
cross-paper synthesis requires package-local action receipts for every Stage 4
artifact bundle and paper analysis row; direct SQLite rows are not valid state.
persist_resolver requires a complete paged library index receipt stored in
library_index_pages.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from gate_runtime import next_action
from runtime_db import (
    artifact_hash,
    build_cross_paper_context,
    clear_failed_retryable,
    connect,
    get_key_value,
    get_meta,
    missing_paper_analysis_refs,
    missing_required_sections,
    paper_analysis_values,
    paper_artifact_bundle_values,
    paper_refs,
    paper_workset_values,
    persist_library_index_page,
    persist_paper_artifact_bundle,
    persist_paper_artifact_bundles,
    persist_cross_paper_synthesis,
    persist_paper_analysis,
    persist_paper_analyses,
    persist_paper_workset,
    persist_resolver,
    persist_topic_intent,
    pretty_json,
    read_json_file,
    record_action_receipt,
    register_artifact,
    register_section_output,
    require_stage4_action_receipts_complete,
    section_names,
    section_payload,
    set_meta,
    set_stage_state,
    sha256_file,
    validate_paper_evidence_against_bundles,
    validate_topic_section_contract,
)

FULL_SECTIONS = (
    "topic",
    "summary",
    "claims",
    "timeline_events",
    "paper_evidence",
    "external_literature_analysis",
    "coverage",
    "gaps",
    "source_artifacts",
    "diagnostics",
)


def write_json(path: Path, value: object) -> str:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(pretty_json(value), encoding="utf-8")
    return sha256_file(path)


def write_text(path: Path, value: str) -> str:
    path.parent.mkdir(parents=True, exist_ok=True)
    normalized = value.replace("\r\n", "\n").replace("\r", "\n")
    path.write_text(normalized, encoding="utf-8")
    return sha256_file(path)


def safe_section_file(section_name: str) -> str:
    return section_name.replace("_", "-") + ".json"


def markdown_from_db(conn) -> str:
    """Render a compact Markdown export from SQLite section payloads."""

    topic = section_payload(conn, "topic") if "topic" in section_names(conn) else {}
    summary = section_payload(conn, "summary") if "summary" in section_names(conn) else {}
    claims = section_payload(conn, "claims") if "claims" in section_names(conn) else []
    coverage = section_payload(conn, "coverage") if "coverage" in section_names(conn) else {}
    title = topic.get("title") if isinstance(topic, dict) else None
    lines = [f"# {title or 'Topic Synthesis'}", ""]
    if isinstance(summary, dict):
        for key in ("brief", "overview", "summary"):
            value = summary.get(key)
            if isinstance(value, str) and value.strip():
                lines.extend([value.strip(), ""])
                break
    elif isinstance(summary, str) and summary.strip():
        lines.extend([summary.strip(), ""])
    if isinstance(claims, list) and claims:
        lines.extend(["## Claims", ""])
        for index, claim in enumerate(claims, start=1):
            if isinstance(claim, dict):
                text = claim.get("claim") or claim.get("text") or claim.get("title") or str(claim)
            else:
                text = str(claim)
            lines.append(f"{index}. {text}")
        lines.append("")
    if isinstance(coverage, dict) and coverage:
        lines.extend(["## Coverage", "", "```json", json.dumps(coverage, ensure_ascii=False, indent=2), "```", ""])
    lines.append("<!-- export.md rendered from SQLite state -->")
    return "\n".join(lines) + "\n"


def verify_registered_file_hash(conn, run_root: Path, relative_path: str) -> None:
    registered = artifact_hash(conn, relative_path)
    actual = sha256_file(run_root / relative_path)
    if registered != actual:
        raise RuntimeError(
            f"hash registry mismatch for {relative_path}: registry={registered}, actual={actual}"
        )


def render_from_sqlite(conn, run_root: Path, *, operation: str, language: str) -> dict:
    """Render final artifacts from SQLite state and verify artifact_registry hashes."""

    require_stage4_action_receipts_complete(conn)
    missing = missing_required_sections(conn, operation=operation)
    if missing:
        raise RuntimeError(f"missing_required_sections: {', '.join(missing)}")

    result_root = run_root / "result"
    sections_root = result_root / "sections"
    manifest_sections: dict[str, dict[str, str]] = {}
    selected_sections = (
        section_names(conn) if operation == "update_patch" else list(FULL_SECTIONS)
    )
    if operation != "update_patch":
        validate_topic_section_contract(
            conn,
            {section_name: section_payload(conn, section_name) for section_name in FULL_SECTIONS},
            require_complete=True,
        )
    for section_name in selected_sections:
        value = section_payload(conn, section_name)
        if section_name == "paper_evidence":
            validate_paper_evidence_against_bundles(conn, value)
        relative_path = f"result/sections/{safe_section_file(section_name)}"
        hash_value = write_json(run_root / relative_path, value)
        register_section_output(
            conn,
            section_name=section_name,
            path=relative_path,
            hash_value=hash_value,
        )
        manifest_sections[section_name] = {
            "path": relative_path,
            "hash": hash_value,
            "content_type": "json",
        }

    manifest_path = (
        "result/topic-analysis.patch.json"
        if operation == "update_patch"
        else "result/topic-analysis.json"
    )
    if operation == "update_patch":
        manifest = {
            "schema_id": "synthesis.topic_section_patch_manifest",
            "schema_version": "2.0.0",
            "operation": "update_patch",
            "language": language,
            "changed_sections": selected_sections,
            "read_section_hashes": get_meta(conn, "read_section_hashes", {}),
            "sections": manifest_sections,
        }
    else:
        manifest = {
            "schema_id": "synthesis.topic_analysis_manifest",
            "schema_version": "2.0.0",
            "operation": operation,
            "language": language,
            "sections": manifest_sections,
        }
    manifest_hash = write_json(run_root / manifest_path, manifest)

    export_hash = None
    if operation != "update_patch":
        export_hash = write_text(result_root / "preview.md", markdown_from_db(conn))
        write_text(result_root / "export.md", markdown_from_db(conn))

    topic_definition = get_key_value(conn, "topic_intent", "topic_definition", {})
    topic_resolver = get_key_value(conn, "topic_resolver", "topic_resolver", {})
    resolved_paper_set = get_key_value(
        conn,
        "topic_resolver",
        "resolved_paper_set",
        {"papers": paper_workset_values(conn)},
    )
    resolver_diagnostics = get_key_value(
        conn,
        "topic_resolver",
        "resolver_diagnostics",
        {"final_count": len(paper_refs(conn)), "warnings": []},
    )
    artifact_metadata = get_meta(conn, "artifact_metadata", {})
    if not artifact_metadata:
        artifact_metadata = {
            "depends_on": {
                "papers": paper_refs(conn),
                "artifacts": ["digest-markdown", "references-json", "citation-analysis-json"],
            },
            "paper_analysis_count": len(paper_analysis_values(conn)),
        }
    final = {
        "__SKILL_DONE__": True,
        "kind": "topic_synthesis",
        "operation": operation,
        "language": language,
        "base_hashes": get_meta(
            conn,
            "base_hashes",
            {"manifest": "", "artifact": "", "export": "", "metadata": "", "index": ""},
        ),
        "topic_definition": topic_definition,
        "topic_resolver": topic_resolver,
        "resolved_paper_set": resolved_paper_set,
        "resolver_diagnostics": resolver_diagnostics,
        "artifact_metadata": artifact_metadata,
        "analysis_manifest_path": manifest_path,
    }
    if operation == "update_patch":
        final["topic_id"] = (
            topic_definition.get("id") if isinstance(topic_definition, dict) else None
        ) or get_meta(conn, "topic_id", "")
        final["read_section_hashes"] = get_meta(conn, "read_section_hashes", {})
    else:
        final["markdown_path"] = "result/preview.md"
    final_hash = write_json(result_root / "result.json", final)

    register_artifact(
        conn,
        path=manifest_path,
        hash_value=manifest_hash,
        content_type="json",
        schema_id=manifest["schema_id"],
        stage="stage_6_render_and_validate",
        validated=True,
    )
    if export_hash:
        register_artifact(
            conn,
            path="result/preview.md",
            hash_value=export_hash,
            content_type="markdown",
            schema_id="synthesis.topic_markdown_export",
            stage="stage_6_render_and_validate",
            validated=True,
        )
    register_artifact(
        conn,
        path="result/result.json",
        hash_value=final_hash,
        content_type="json",
        schema_id="synthesis.topic_synthesis_final_bundle",
        stage="stage_6_render_and_validate",
        validated=True,
    )
    verify_registered_file_hash(conn, run_root, manifest_path)
    verify_registered_file_hash(conn, run_root, "result/result.json")
    if export_hash:
        verify_registered_file_hash(conn, run_root, "result/preview.md")

    set_stage_state(conn, "stage_6_render_and_validate", "completed")
    set_stage_state(conn, "stage_7_completed", "completed")
    return {
        "manifest_path": manifest_path,
        "manifest_hash": manifest_hash,
        "final_path": "result/result.json",
        "final_hash": final_hash,
        "markdown_path": None if operation == "update_patch" else "result/preview.md",
        "export_hash": export_hash,
    }


def require_payload(args: argparse.Namespace) -> dict:
    if not args.payload_file:
        raise SystemExit(f"--payload-file is required for --action {args.action}")
    payload = read_json_file(args.payload_file)
    if not isinstance(payload, dict):
        raise SystemExit("--payload-file must contain a JSON object")
    return payload


def action_stage(action_name: str) -> str:
    if action_name in {"persist_paper_artifact_bundle", "persist_paper_artifact_bundles", "persist_paper_analysis", "persist_paper_analyses"}:
        return "stage_4_per_paper_analysis"
    if action_name in {"export_cross_paper_context", "persist_cross_paper_synthesis"}:
        return "stage_5_cross_paper_synthesis"
    if action_name == "render":
        return "stage_6_render_and_validate"
    if action_name == "persist_paper_workset":
        return "stage_3_paper_workset"
    if action_name in {"persist_library_index_page", "persist_resolver"}:
        return "stage_2_resolver"
    if action_name == "persist_topic_intent":
        return "stage_1_topic_intent"
    return "stage_0_bootstrap"


def stage_result(conn, action_name: str, payload: dict, result: dict) -> dict:
    receipt = record_action_receipt(
        conn,
        action_name=action_name,
        payload=payload,
        result=result,
    )
    return {"action": action_name, "receipt": receipt, "result": result}


def export_cross_paper_context(conn, run_root: Path) -> dict:
    """Materialize a deterministic cross-paper context from SQLite SSOT."""

    require_stage4_action_receipts_complete(conn)
    bundled = {bundle.get("paper_ref") for bundle in paper_artifact_bundle_values(conn)}
    missing_bundles = [ref for ref in paper_refs(conn) if ref not in bundled]
    if missing_bundles:
        raise RuntimeError(f"missing_paper_artifact_bundles: {', '.join(missing_bundles)}")
    missing_analysis = missing_paper_analysis_refs(conn)
    if missing_analysis:
        raise RuntimeError(f"missing_paper_analysis: {', '.join(missing_analysis)}")
    context = build_cross_paper_context(conn)
    relative_path = "runtime/views/cross-paper-context.json"
    context_hash = write_json(run_root / relative_path, context)
    register_artifact(
        conn,
        path=relative_path,
        hash_value=context_hash,
        content_type="json",
        schema_id="synthesis.cross_paper_context",
        stage="stage_5_cross_paper_synthesis",
        validated=True,
    )
    set_meta(conn, "source_context_path", relative_path)
    set_meta(conn, "source_context_hash", context_hash)
    verify_registered_file_hash(conn, run_root, relative_path)
    return {
        "source_context_path": relative_path,
        "source_context_hash": context_hash,
        "paper_count": context["paper_count"],
        "bundle_receipt_count": context["bundle_receipt_count"],
        "analysis_count": context["analysis_count"],
        "artifact_counts": context["artifact_counts"],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", default="runtime/topic-synthesis.sqlite")
    parser.add_argument("--run-root", default=".")
    parser.add_argument("--operation", default="create")
    parser.add_argument("--language", default="auto")
    parser.add_argument("--action", default="render")
    parser.add_argument("--payload-file")
    parser.add_argument("--paper-ref")
    args = parser.parse_args()

    conn = connect(args.db)
    if args.action == "gate":
        print(json.dumps(next_action(conn), ensure_ascii=False, sort_keys=True))
        return
    if args.action == "cancel":
        set_stage_state(conn, "stage_7_completed", "canceled")
        canceled = {
            "__SKILL_DONE__": True,
            "kind": "topic_synthesis_canceled",
            "status": "canceled",
            "reason": "user_cancelled",
            "message": "Topic synthesis was canceled.",
        }
        print(json.dumps(canceled, ensure_ascii=False, sort_keys=True))
        return

    try:
        if args.action == "persist_topic_intent":
            payload = require_payload(args)
            result = persist_topic_intent(conn, payload)
            set_stage_state(conn, "stage_0_bootstrap", "completed")
            set_stage_state(conn, "stage_1_topic_intent", "completed")
            set_stage_state(conn, "stage_2_resolver", "running")
            print(json.dumps(stage_result(conn, args.action, payload, result), ensure_ascii=False, sort_keys=True))
            return

        if args.action == "persist_library_index_page":
            payload = require_payload(args)
            result = persist_library_index_page(conn, payload)
            set_stage_state(conn, "stage_2_resolver", "running")
            print(json.dumps(stage_result(conn, args.action, payload, result), ensure_ascii=False, sort_keys=True))
            return

        if args.action == "persist_resolver":
            payload = require_payload(args)
            result = persist_resolver(conn, payload)
            set_stage_state(conn, "stage_2_resolver", "completed")
            set_stage_state(conn, "stage_3_paper_workset", "running")
            print(json.dumps(stage_result(conn, args.action, payload, result), ensure_ascii=False, sort_keys=True))
            return

        if args.action == "persist_paper_workset":
            payload = require_payload(args)
            result = persist_paper_workset(conn, payload)
            set_stage_state(conn, "stage_3_paper_workset", "completed")
            if result["paper_count"] == 0:
                set_stage_state(conn, "stage_4_per_paper_analysis", "completed")
                set_stage_state(conn, "stage_5_cross_paper_synthesis", "running")
            else:
                set_stage_state(conn, "stage_4_per_paper_analysis", "running")
            print(json.dumps(stage_result(conn, args.action, payload, result), ensure_ascii=False, sort_keys=True))
            return

        if args.action == "persist_paper_artifact_bundle":
            if not args.paper_ref:
                raise SystemExit("--paper-ref is required for persist_paper_artifact_bundle")
            payload = require_payload(args)
            result = persist_paper_artifact_bundle(conn, args.paper_ref, payload)
            set_stage_state(conn, "stage_4_per_paper_analysis", "running")
            print(json.dumps(stage_result(conn, args.action, payload, result), ensure_ascii=False, sort_keys=True))
            return

        if args.action == "persist_paper_artifact_bundles":
            payload = require_payload(args)
            result = persist_paper_artifact_bundles(conn, payload, run_root=args.run_root)
            set_stage_state(conn, "stage_4_per_paper_analysis", "running")
            print(json.dumps(stage_result(conn, args.action, payload, result), ensure_ascii=False, sort_keys=True))
            return

        if args.action == "persist_paper_analysis":
            if not args.paper_ref:
                raise SystemExit("--paper-ref is required for persist_paper_analysis")
            payload = require_payload(args)
            result = persist_paper_analysis(conn, args.paper_ref, payload)
            if not missing_paper_analysis_refs(conn):
                set_stage_state(conn, "stage_4_per_paper_analysis", "completed")
                set_stage_state(conn, "stage_5_cross_paper_synthesis", "running")
            else:
                set_stage_state(conn, "stage_4_per_paper_analysis", "running")
            print(json.dumps(stage_result(conn, args.action, payload, result), ensure_ascii=False, sort_keys=True))
            return

        if args.action == "persist_paper_analyses":
            payload = require_payload(args)
            result = persist_paper_analyses(conn, payload, run_root=args.run_root)
            if not missing_paper_analysis_refs(conn):
                set_stage_state(conn, "stage_4_per_paper_analysis", "completed")
                set_stage_state(conn, "stage_5_cross_paper_synthesis", "running")
            else:
                set_stage_state(conn, "stage_4_per_paper_analysis", "running")
            print(json.dumps(stage_result(conn, args.action, payload, result), ensure_ascii=False, sort_keys=True))
            return

        if args.action == "export_cross_paper_context":
            result = export_cross_paper_context(conn, Path(args.run_root))
            set_stage_state(conn, "stage_5_cross_paper_synthesis", "running")
            print(json.dumps(stage_result(conn, args.action, {}, result), ensure_ascii=False, sort_keys=True))
            return

        if args.action == "persist_cross_paper_synthesis":
            payload = require_payload(args)
            result = persist_cross_paper_synthesis(conn, payload)
            set_stage_state(conn, "stage_5_cross_paper_synthesis", "completed")
            set_stage_state(conn, "stage_6_render_and_validate", "running")
            print(json.dumps(stage_result(conn, args.action, payload, result), ensure_ascii=False, sort_keys=True))
            return

        if args.action == "render":
            operation = args.operation
            language = "zh-CN" if args.language == "auto" else args.language
            set_meta(conn, "operation", operation)
            set_meta(conn, "language", language)
            rendered = render_from_sqlite(
                conn,
                Path(args.run_root),
                operation=operation,
                language=language,
            )
            print(json.dumps(rendered, ensure_ascii=False, sort_keys=True))
            return

        raise SystemExit(f"unsupported --action: {args.action}")
    except Exception as error:
        # resume/failure discipline: retryable malformed payloads stay on the same stage.
        stage = action_stage(args.action)
        clear_failed_retryable(conn, stage)
        set_stage_state(conn, stage, "failed_retryable", error=str(error))
        raise


if __name__ == "__main__":
    main()
