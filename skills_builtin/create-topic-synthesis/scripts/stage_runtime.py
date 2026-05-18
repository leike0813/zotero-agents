"""Stage helpers and section-file validator for create-topic-synthesis.

Agents must resume from SQLite, execute only the gate-computed next action, and
strictly validates agent-authored result/sections files before producing final
artifacts. No placeholder semantic content is generated here. Failure states include failed_retryable,
failed_terminal, and canceled. Only registered final stdout is valid.
partial/unregistered output is invalid. artifact_registry hashes are checked
before final stdout is accepted.
State-changing actions write deterministic action receipts for idempotent retry.
validate_final_artifacts validates paper_evidence digest_ref payload_hash against SQLite bundles.
validate_final_artifacts validates evidence_refs against paper_evidence.id and external_literature_analysis.summary.
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
    build_cross_paper_context_views,
    clear_failed_retryable,
    connect,
    get_key_value,
    get_meta,
    missing_paper_analysis_refs,
    paper_analysis_values,
    paper_artifact_bundle_values,
    paper_refs,
    paper_workset_values,
    persist_citation_graph_metrics,
    persist_cross_paper_evidence_map,
    persist_library_index_page,
    persist_filtered_artifact_manifest,
    persist_paper_analysis,
    persist_paper_analyses,
    persist_resolver,
    persist_topic_intent,
    pretty_json,
    read_json_file,
    record_action_receipt,
    register_artifact,
    register_section_output,
    require_stage4_action_receipts_complete,
    set_meta,
    set_stage_state,
    sha256_file,
    validate_paper_evidence_against_bundles,
    validate_topic_section_contract,
)

FULL_SECTIONS = (
    "topic",
    "summary",
    "positioning",
    "taxonomy",
    "comparison_matrix",
    "claims",
    "timeline_events",
    "paper_evidence",
    "external_literature_analysis",
    "debates",
    "coverage",
    "gaps",
    "review_outline",
    "evidence_map",
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


def verify_registered_file_hash(conn, run_root: Path, relative_path: str) -> None:
    registered = artifact_hash(conn, relative_path)
    actual = sha256_file(run_root / relative_path)
    if registered != actual:
        raise RuntimeError(
            f"hash registry mismatch for {relative_path}: registry={registered}, actual={actual}"
        )


def require_payload(args: argparse.Namespace) -> dict:
    if not args.payload_file:
        raise SystemExit(f"--payload-file is required for --action {args.action}")
    payload = read_json_file(args.payload_file)
    if not isinstance(payload, dict):
        raise SystemExit("--payload-file must contain a JSON object")
    return payload


def action_stage(action_name: str) -> str:
    if action_name in {
        "persist_citation_graph_metrics",
        "persist_filtered_artifact_manifest",
        "persist_paper_analysis",
        "persist_paper_analyses",
    }:
        return "stage_4_per_paper_analysis"
    if action_name in {"export_cross_paper_context", "validate_cross_paper_evidence_map"}:
        return "stage_5_cross_paper_synthesis"
    if action_name == "validate_final_artifacts":
        return "stage_6_render_and_validate"
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
    views = build_cross_paper_context_views(conn, run_root)
    main_path = "runtime/views/cross-paper-context.md"
    external_path = "runtime/views/external-literature-context.md"
    manifest_path = "runtime/views/cross-paper-context.manifest.json"

    main_hash = write_text(run_root / main_path, str(views["main_markdown"]))
    external_hash = write_text(run_root / external_path, str(views["external_markdown"]))
    manifest = dict(views["manifest"])
    manifest["contexts"] = {
        "main": {
            "path": main_path,
            "hash": main_hash,
            "content_type": "markdown",
            "bytes": (run_root / main_path).stat().st_size,
        },
        "external_literature": {
            "path": external_path,
            "hash": external_hash,
            "content_type": "markdown",
            "bytes": (run_root / external_path).stat().st_size,
        },
    }
    manifest_hash = write_json(run_root / manifest_path, manifest)
    register_artifact(
        conn,
        path=main_path,
        hash_value=main_hash,
        content_type="markdown",
        schema_id="synthesis.cross_paper_context.main_markdown",
        stage="stage_5_cross_paper_synthesis",
        validated=True,
    )
    register_artifact(
        conn,
        path=external_path,
        hash_value=external_hash,
        content_type="markdown",
        schema_id="synthesis.cross_paper_context.external_markdown",
        stage="stage_5_cross_paper_synthesis",
        validated=True,
    )
    register_artifact(
        conn,
        path=manifest_path,
        hash_value=manifest_hash,
        content_type="json",
        schema_id="synthesis.cross_paper_context_manifest",
        stage="stage_5_cross_paper_synthesis",
        validated=True,
    )
    set_meta(conn, "source_context_path", main_path)
    set_meta(conn, "source_context_hash", main_hash)
    set_meta(conn, "external_context_path", external_path)
    set_meta(conn, "external_context_hash", external_hash)
    set_meta(conn, "source_context_manifest_path", manifest_path)
    set_meta(conn, "source_context_manifest_hash", manifest_hash)
    verify_registered_file_hash(conn, run_root, main_path)
    verify_registered_file_hash(conn, run_root, external_path)
    verify_registered_file_hash(conn, run_root, manifest_path)
    return {
        "source_context_path": main_path,
        "source_context_hash": main_hash,
        "external_context_path": external_path,
        "external_context_hash": external_hash,
        "manifest_path": manifest_path,
        "manifest_hash": manifest_hash,
        "paper_count": manifest["paper_count"],
        "bundle_receipt_count": manifest["bundle_receipt_count"],
        "analysis_count": manifest["analysis_count"],
        "artifact_counts": manifest["artifact_counts"],
    }


def read_section_files(run_root: Path, operation: str) -> dict:
    sections_root = run_root / "result" / "sections"
    selected = []
    for path in sorted(sections_root.glob("*.json")):
        selected.append(path.stem.replace("-", "_"))
    required = selected if operation == "update_patch" else list(FULL_SECTIONS)
    sections: dict[str, object] = {}
    missing = []
    for section_name in required:
        path = sections_root / safe_section_file(section_name)
        if not path.exists():
            missing.append(section_name)
            continue
        value = read_json_file(path)
        sections[section_name] = value
    if missing:
        raise RuntimeError(f"missing_required_section_files: {', '.join(missing)}")
    return sections


def markdown_from_sections(sections: dict) -> str:
    topic = sections.get("topic", {})
    summary = sections.get("summary", {})
    claims = sections.get("claims", [])
    coverage = sections.get("coverage", {})
    title = topic.get("title") if isinstance(topic, dict) else None
    lines = [f"# {title or 'Topic Synthesis'}", ""]
    if isinstance(summary, dict):
        for key in ("brief", "overview", "summary"):
            value = summary.get(key)
            if isinstance(value, str) and value.strip():
                lines.extend([value.strip(), ""])
                break
    if isinstance(claims, list) and claims:
        lines.extend(["## Claims", ""])
        for index, claim in enumerate(claims, start=1):
            text = claim.get("text") if isinstance(claim, dict) else str(claim)
            lines.append(f"{index}. {text}")
        lines.append("")
    taxonomy = sections.get("taxonomy", {})
    if isinstance(taxonomy, dict) and taxonomy:
        lines.extend(["## Taxonomy", "", "```json", json.dumps(taxonomy, ensure_ascii=False, indent=2), "```", ""])
    comparison = sections.get("comparison_matrix", {})
    if isinstance(comparison, dict) and comparison:
        lines.extend(["## Comparison Matrix", "", "```json", json.dumps(comparison, ensure_ascii=False, indent=2), "```", ""])
    debates = sections.get("debates", [])
    if isinstance(debates, list) and debates:
        lines.extend(["## Debates", ""])
        for debate in debates:
            if isinstance(debate, dict):
                lines.append(f"- {debate.get('title') or debate.get('text') or debate.get('id')}")
        lines.append("")
    gaps = sections.get("gaps", [])
    if isinstance(gaps, list) and gaps:
        lines.extend(["## Gaps", ""])
        for gap in gaps:
            if isinstance(gap, dict):
                lines.append(f"- {gap.get('title') or gap.get('text') or gap.get('id')}")
        lines.append("")
    if isinstance(coverage, dict) and coverage:
        lines.extend(["## Coverage", "", "```json", json.dumps(coverage, ensure_ascii=False, indent=2), "```", ""])
    lines.append("<!-- export.md rendered from validated result/sections files -->")
    return "\n".join(lines) + "\n"


def validate_final_artifacts(conn, run_root: Path, *, operation: str, language: str) -> dict:
    require_stage4_action_receipts_complete(conn)
    sections = read_section_files(run_root, operation)
    sections = inject_section_digest_refs(conn, sections)
    if operation != "update_patch":
        validate_topic_section_contract(conn, sections, require_complete=True)
    else:
        validate_topic_section_contract(conn, sections, require_complete=False)
    if "paper_evidence" in sections:
        validate_paper_evidence_against_bundles(conn, sections["paper_evidence"])
    manifest_sections: dict[str, dict[str, str]] = {}
    for section_name in sorted(sections):
        relative_path = f"result/sections/{safe_section_file(section_name)}"
        hash_value = write_json(run_root / relative_path, sections[section_name])
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
            "changed_sections": sorted(sections),
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
    markdown_path = None
    markdown_hash = None
    if operation != "update_patch":
        markdown = markdown_from_sections(sections)
        markdown_path = "result/preview.md"
        markdown_hash = write_text(run_root / markdown_path, markdown)
        write_text(run_root / "result/export.md", markdown)
    topic_definition = get_key_value(conn, "topic_intent", "topic_definition", {})
    if not isinstance(topic_definition, dict) or not str(topic_definition.get("id") or "").strip():
        raise ValueError("validate_final_artifacts requires topic_definition.id from stage_1_topic_intent")
    resolver_manifest_path = "runtime/payloads/resolver.json"
    resolver_diagnostics = get_key_value(
        conn,
        "topic_resolver",
        "resolver_diagnostics",
        {"final_count": len(paper_refs(conn)), "warnings": []},
    )
    if not isinstance(resolver_diagnostics, dict):
        resolver_diagnostics = {"final_count": len(paper_refs(conn)), "warnings": []}
    resolver_manifest_file = run_root / resolver_manifest_path
    resolver_diagnostics = {
        "final_count": resolver_diagnostics.get("final_count", len(paper_refs(conn))),
        "warnings": resolver_diagnostics.get("warnings", []),
        "paper_refs_count": len(paper_refs(conn)),
        "manifest_hash": sha256_file(resolver_manifest_file) if resolver_manifest_file.exists() else "",
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
        "resolver_manifest_path": resolver_manifest_path,
        "resolver_diagnostics": resolver_diagnostics,
        "artifact_metadata": get_meta(conn, "artifact_metadata", {}),
        "analysis_manifest_path": manifest_path,
    }
    if operation == "update_patch":
        final["topic_id"] = (
            topic_definition.get("id") if isinstance(topic_definition, dict) else None
        ) or get_meta(conn, "topic_id", "")
        final["read_section_hashes"] = get_meta(conn, "read_section_hashes", {})
    else:
        final["markdown_path"] = markdown_path
    final_hash = write_json(run_root / "result/result.json", final)
    register_artifact(
        conn,
        path=manifest_path,
        hash_value=manifest_hash,
        content_type="json",
        schema_id=manifest["schema_id"],
        stage="stage_6_render_and_validate",
        validated=True,
    )
    if markdown_path and markdown_hash:
        register_artifact(
            conn,
            path=markdown_path,
            hash_value=markdown_hash,
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
    set_stage_state(conn, "stage_6_render_and_validate", "completed")
    set_stage_state(conn, "stage_7_completed", "completed")
    return {
        "manifest_path": manifest_path,
        "manifest_hash": manifest_hash,
        "final_path": "result/result.json",
        "final_hash": final_hash,
        "markdown_path": markdown_path,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", default="runtime/topic-synthesis.sqlite")
    parser.add_argument("--run-root", default=".")
    parser.add_argument("--operation", default="create")
    parser.add_argument("--language", default="auto")
    parser.add_argument("--action", default="validate_final_artifacts")
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
            set_stage_state(conn, "stage_3_paper_workset", "completed")
            if result.get("paper_refs"):
                set_stage_state(conn, "stage_4_per_paper_analysis", "running")
            else:
                set_stage_state(conn, "stage_4_per_paper_analysis", "completed")
                set_stage_state(conn, "stage_5_cross_paper_synthesis", "running")
            print(json.dumps(stage_result(conn, args.action, payload, result), ensure_ascii=False, sort_keys=True))
            return

        if args.action == "persist_citation_graph_metrics":
            payload = require_payload(args)
            result = persist_citation_graph_metrics(conn, payload)
            set_stage_state(conn, "stage_4_per_paper_analysis", "running")
            print(json.dumps(stage_result(conn, args.action, payload, result), ensure_ascii=False, sort_keys=True))
            return

        if args.action == "persist_filtered_artifact_manifest":
            payload = require_payload(args)
            result = persist_filtered_artifact_manifest(conn, payload, run_root=args.run_root)
            set_stage_state(conn, "stage_4_per_paper_analysis", "running")
            print(json.dumps(stage_result(conn, args.action, payload, result), ensure_ascii=False, sort_keys=True))
            return

        if args.action == "persist_paper_analysis":
            if not args.paper_ref:
                raise SystemExit("--paper-ref is required for persist_paper_analysis")
            payload = require_payload(args)
            result = persist_paper_analysis(conn, args.paper_ref, payload, run_root=args.run_root)
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

        if args.action == "validate_cross_paper_evidence_map":
            payload = require_payload(args)
            result = persist_cross_paper_evidence_map(conn, payload, run_root=args.run_root)
            set_stage_state(conn, "stage_5_cross_paper_synthesis", "running")
            print(json.dumps(stage_result(conn, args.action, payload, result), ensure_ascii=False, sort_keys=True))
            return

        if args.action == "validate_final_artifacts":
            operation = args.operation
            language = "zh-CN" if args.language == "auto" else args.language
            set_meta(conn, "operation", operation)
            set_meta(conn, "language", language)
            rendered = validate_final_artifacts(
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
    inject_section_digest_refs,
