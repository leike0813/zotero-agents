"""Stage helpers and section-file validator for update-topic-synthesis.

Agents must resume from SQLite, execute only the gate-computed next action, and
strictly validates agent-authored result/sections files before producing final
artifacts. No placeholder semantic content is generated here. Failure states include failed_retryable,
failed_terminal, and canceled. Only registered final stdout is valid.
partial/unregistered output is invalid. artifact_registry hashes are checked
before final stdout is accepted.
State-changing actions write deterministic action receipts for idempotent retry.
validate_final_artifacts validates paper_evidence digest_ref payload_hash against SQLite bundles.
validate_final_artifacts validates evidence_refs against paper_evidence.id and external_literature_analysis.summary.
persist_paper_units validates paper-unit analyses against Stage 4 artifact bundle receipts.
cross-paper synthesis requires package-local action receipts for every Stage 4
artifact bundle and paper unit row; direct SQLite rows are not valid state.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from gate_runtime import next_action
from runtime_db import (
    audit_runtime_integrity,
    artifact_hash,
    build_cross_paper_context_views,
    clear_failed_retryable,
    connect,
    get_key_value,
    get_meta,
    missing_paper_analysis_refs,
    missing_citation_graph_metric_receipt_refs,
    missing_paper_artifact_bundle_receipt_refs,
    paper_analysis_values,
    paper_artifact_bundle_values,
    paper_refs,
    paper_workset_values,
    persist_citation_graph_metrics,
    persist_cross_paper_evidence_map,
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
    inject_section_digest_refs,
    _clean_text,
    _evidence_map_candidate_ids,
    _validate_evidence_map_refs,
    _validate_nested_evidence_map_refs,
    validate_paper_evidence_against_bundles,
    validate_topic_section_contract,
    validate_topic_synthesis_artifact_schema,
)

ACTION_ALIASES = {
    "persist_paper_analysis": "persist_paper_unit",
    "persist_paper_analyses": "persist_paper_units",
    "validate_cross_paper_evidence_map": "persist_cross_paper_evidence_map",
    "validate_route_timeline_synthesis": "persist_route_timeline",
    "validate_core_analytical_sections": "persist_core_sections",
}

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
    "statistics",
    "synthesis_report",
    "evidence_map",
    "source_artifacts",
    "diagnostics",
)

FINAL_REWRITE_PATHS = {
    "result/result.json",
    "result/topic-analysis.json",
    "result/topic-analysis.patch.json",
    "result/sidecars/topic-interest-metadata.json",
}
TOPIC_INTEREST_METADATA_PATH = "result/sidecars/topic-interest-metadata.json"
CONCEPT_CARDS_PROPOSAL_PATH = "result/sidecars/concept-cards-proposal.json"
TOPIC_GRAPH_RELATION_PROPOSALS_PATH = "result/sidecars/topic-graph-relation-proposals.json"

ROUTE_TIMELINE_SECTIONS = ("taxonomy", "timeline_events")
CORE_SECTIONS = (
    "positioning",
    "claims",
    "comparison_matrix",
    "debates",
    "gaps",
    "review_outline",
)
STAGE9_AUTHORED_SECTIONS = (
    "topic",
    "summary",
    "paper_evidence",
    "external_literature_analysis",
    "coverage",
    "statistics",
    "synthesis_report",
    "evidence_map",
    "source_artifacts",
    "diagnostics",
)
VALID_GAP_TYPES = {"research_gap", "library_coverage_gap", "evidence_gap", "evaluation_gap"}


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


def _limited_unique_strings(values: object, limit: int) -> list[str]:
    if isinstance(values, str):
        source = [values]
    elif isinstance(values, list):
        source = values
    else:
        source = []
    result: list[str] = []
    seen: set[str] = set()
    for value in source:
        text = _clean_text(value)
        key = text.lower()
        if text and key not in seen:
            seen.add(key)
            result.append(text)
        if len(result) >= limit:
            break
    return result


def _topic_scope_terms(topic_definition: dict, key: str) -> list[str]:
    scope = topic_definition.get("scope_boundary")
    if not isinstance(scope, dict):
        return []
    values = scope.get(key)
    if isinstance(values, list):
        return _limited_unique_strings(values, 16)
    if isinstance(values, str):
        return _limited_unique_strings([values], 16)
    return []


def build_topic_interest_metadata(topic_definition: dict, artifact_metadata: object) -> dict:
    explicit = {}
    if isinstance(artifact_metadata, dict) and isinstance(
        artifact_metadata.get("topic_interest_metadata"), dict
    ):
        explicit = artifact_metadata["topic_interest_metadata"]

    title = _clean_text(topic_definition.get("title"))
    aliases = _limited_unique_strings(topic_definition.get("aliases"), 8)
    include_terms = _limited_unique_strings(
        [
            *_limited_unique_strings(explicit.get("include_terms", []), 16),
            title,
            *aliases,
            *_topic_scope_terms(topic_definition, "include"),
        ],
        16,
    )
    must_have_terms = _limited_unique_strings(
        explicit.get("must_have_terms", []) or [title],
        6,
    )
    exclude_terms = _limited_unique_strings(
        [
            *_limited_unique_strings(explicit.get("exclude_terms", []), 8),
            *_topic_scope_terms(topic_definition, "exclude"),
        ],
        8,
    )
    diagnostics = _limited_unique_strings(explicit.get("diagnostics", []), 16)
    if not explicit:
        diagnostics.append("topic_interest_metadata_derived_from_topic_definition")
    return {
        "schema": "topic_interest_metadata.v1",
        "topic_id": _clean_text(topic_definition.get("id")),
        "include_terms": include_terms,
        "must_have_terms": must_have_terms,
        "methods": _limited_unique_strings(explicit.get("methods", []), 8),
        "exclude_terms": exclude_terms,
        "seed_literature_item_ids": _limited_unique_strings(
            explicit.get("seed_literature_item_ids", []),
            50,
        ),
        "diagnostics": diagnostics,
    }


def require_payload(args: argparse.Namespace) -> dict:
    if not args.payload_file:
        raise SystemExit(f"--payload-file is required for --action {args.action}")
    payload = read_json_file(args.payload_file)
    if not isinstance(payload, dict):
        raise SystemExit("--payload-file must contain a JSON object")
    return payload


def action_stage(action_name: str) -> str:
    action_name = ACTION_ALIASES.get(action_name, action_name)
    if action_name == "confirm_runtime_setup":
        return "stage_0_runtime_setup"
    if action_name in {
        "persist_citation_graph_metrics",
    }:
        return "stage_3_graph_metrics"
    if action_name in {
        "persist_filtered_artifact_manifest",
    }:
        return "stage_4_evidence_collection"
    if action_name in {
        "persist_paper_unit",
        "persist_paper_units",
    }:
        return "stage_5_paper_units"
    if action_name in {
        "export_cross_paper_context",
        "persist_cross_paper_evidence_map",
    }:
        return "stage_6_cross_paper_map"
    if action_name in {
        "persist_route_timeline",
    }:
        return "stage_7_route_timeline"
    if action_name in {
        "persist_core_sections",
    }:
        return "stage_8_core_sections"
    if action_name == "persist_kg_proposals":
        return "stage_9_kg_proposals"
    if action_name == "persist_external_statistics_report":
        return "stage_10_external_statistics_report"
    if action_name == "validate_final_artifacts":
        return "stage_11_render_and_validate"
    if action_name == "persist_resolver":
        return "stage_2_resolver_and_workset"
    if action_name in {"persist_topic_intent", "persist_topic_context"}:
        return "stage_1_topic_context"
    return "stage_0_runtime_setup"


def stage_result(conn, action_name: str, payload: dict, result: dict) -> dict:
    action_name = ACTION_ALIASES.get(action_name, action_name)
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
        stage="stage_6_cross_paper_map",
        validated=True,
    )
    register_artifact(
        conn,
        path=external_path,
        hash_value=external_hash,
        content_type="markdown",
        schema_id="synthesis.cross_paper_context.external_markdown",
        stage="stage_6_cross_paper_map",
        validated=True,
    )
    register_artifact(
        conn,
        path=manifest_path,
        hash_value=manifest_hash,
        content_type="json",
        schema_id="synthesis.cross_paper_context_manifest",
        stage="stage_6_cross_paper_map",
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


def _require_object(value: object, label: str) -> dict:
    if not isinstance(value, dict):
        raise ValueError(f"{label} must be an object")
    return value


def _require_list(value: object, label: str) -> list:
    if not isinstance(value, list) or not value:
        raise ValueError(f"{label} must be a non-empty array")
    return value


def _has_text(value: dict, *keys: str) -> bool:
    for key in keys:
        entry = value.get(key)
        if isinstance(entry, str) and entry.strip():
            return True
        if isinstance(entry, list) and entry:
            return True
        if isinstance(entry, dict) and entry:
            return True
    return False


def _has_non_empty_refs(value: dict, key: str) -> bool:
    entry = value.get(key)
    return isinstance(entry, list) and any(str(ref).strip() for ref in entry)


def _has_any_text(value: object) -> bool:
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, list):
        return any(_has_any_text(entry) for entry in value)
    if isinstance(value, dict):
        return any(_has_any_text(entry) for entry in value.values())
    return value is not None


def _require_field(value: dict, label: str, *keys: str) -> None:
    if not any(key in value and _has_any_text(value.get(key)) for key in keys):
        raise ValueError(f"{label} requires {'/'.join(keys)}")


def _known_evidence_map_candidates(conn) -> set[str]:
    candidates = _evidence_map_candidate_ids(conn)
    if not candidates:
        raise ValueError("cross_paper_evidence_map must be validated before section prevalidation")
    return candidates


def _require_route_timeline_depth(payload: dict) -> None:
    taxonomy = _require_object(payload.get("taxonomy"), "taxonomy")
    if not _has_text(taxonomy, "primary_axis", "axis"):
        raise ValueError("taxonomy requires primary_axis")
    for node in _require_list(taxonomy.get("nodes"), "taxonomy.nodes"):
        if not isinstance(node, dict):
            raise ValueError("taxonomy.nodes entries must be objects")
        node_id = str(node.get("id") or node.get("route_id") or node.get("title") or "(unknown)")
        for label, aliases in {
            "definition": ("definition", "route_definition", "description"),
            "core_problem": ("core_problem", "problem", "target_problem"),
            "mechanism": ("mechanism", "technical_mechanism", "core_mechanism"),
            "representative_papers": ("representative_papers", "paper_refs", "evidence_refs"),
            "strengths": ("strengths", "advantages"),
            "limitations": ("limitations", "weaknesses"),
            "maturity": ("maturity", "status", "development_stage"),
            "route_relation": (
                "relation_to_other_routes",
                "route_relationships",
                "relations",
                "related_routes",
                "main_tradeoffs",
                "tradeoffs",
                "review_angle",
            ),
        }.items():
            if not _has_text(node, *aliases):
                raise ValueError(f"taxonomy route {node_id} requires {label}")
    timeline = _require_object(payload.get("timeline_events"), "timeline_events")
    for event in _require_list(timeline.get("events"), "timeline_events.events"):
        if not isinstance(event, dict):
            raise ValueError("timeline_events.events entries must be objects")
        event_id = str(event.get("id") or event.get("title") or "(unknown)")
        if not _has_text(event, "description", "analysis", "why_it_matters"):
            raise ValueError(f"timeline {event_id} requires description/analysis")
        if not _has_text(event, "phase", "stage", "progression_logic", "follow_on_effect"):
            raise ValueError(f"timeline {event_id} requires phase or progression logic")
        if not _has_text(event, "historical_role", "milestone_role", "why_it_matters"):
            raise ValueError(f"timeline {event_id} requires milestone role or why_it_matters")
        if not _has_text(event, "follow_on_effect", "relation_to_previous", "progression_logic"):
            raise ValueError(f"timeline {event_id} requires follow_on_effect or progression link")
        if not _has_text(event, "evidence_refs"):
            raise ValueError(f"timeline {event_id} requires evidence_refs")
        if not _has_text(event, "evidence_map_refs"):
            raise ValueError(f"timeline {event_id} requires evidence_map_refs")


def validate_route_timeline_synthesis(conn, payload: dict, run_root: Path) -> dict:
    taxonomy = _require_object(payload.get("taxonomy"), "taxonomy")
    taxonomy_summary = _require_object(taxonomy.get("summary"), "taxonomy.summary")
    if not _has_text(taxonomy_summary, "text", "analysis", "overview"):
        raise ValueError("taxonomy.summary requires text/analysis")
    _require_list(taxonomy.get("nodes"), "taxonomy.nodes")
    timeline = _require_object(payload.get("timeline_events"), "timeline_events")
    timeline_summary = _require_object(timeline.get("summary"), "timeline_events.summary")
    if not _has_text(timeline_summary, "text", "analysis", "overview"):
        raise ValueError("timeline_events.summary requires text/analysis")
    _require_list(timeline.get("events"), "timeline_events.events")
    _require_route_timeline_depth(payload)
    known_candidates = _known_evidence_map_candidates(conn)
    _validate_nested_evidence_map_refs("taxonomy", taxonomy, known_candidates)
    _validate_evidence_map_refs("timeline_events", timeline.get("events", []), known_candidates)
    relative_path = "runtime/payloads/route-timeline-synthesis.json"
    hash_value = write_json(run_root / relative_path, payload)
    register_artifact(
        conn,
        path=relative_path,
        hash_value=hash_value,
        content_type="json",
        schema_id="synthesis.route_timeline_synthesis",
        stage="stage_7_route_timeline",
        validated=True,
    )
    set_meta(conn, "route_timeline_synthesis_path", relative_path)
    set_meta(conn, "route_timeline_synthesis_hash", hash_value)
    return {"path": relative_path, "hash": hash_value}


def _validate_core_sections_depth(conn, payload: dict) -> None:
    known_candidates = _known_evidence_map_candidates(conn)

    positioning = _require_object(payload.get("positioning"), "positioning")
    _require_field(
        positioning,
        "positioning",
        "importance",
        "field_position",
        "review_position",
        "scope_boundary",
    )
    _validate_nested_evidence_map_refs("positioning", positioning, known_candidates)

    claims = _require_list(payload.get("claims"), "claims")
    for claim in claims:
        if not isinstance(claim, dict):
            raise ValueError("claims entries must be objects")
        claim_id = str(claim.get("id") or claim.get("text") or claim.get("claim") or "(unknown)")
        _require_field(claim, f"claim {claim_id}", "id", "text", "claim")
        _require_field(claim, f"claim {claim_id}", "analysis", "rationale", "argument", "explanation")
        if not _has_non_empty_refs(claim, "evidence_refs"):
            raise ValueError(f"claim {claim_id} requires evidence_refs")
        if not _has_non_empty_refs(claim, "evidence_map_refs"):
            raise ValueError(f"claim {claim_id} requires evidence_map_refs")
        _require_field(claim, f"claim {claim_id}", "confidence")
        _require_field(claim, f"claim {claim_id}", "scope", "limitations", "applicability")
    _validate_evidence_map_refs("claims", claims, known_candidates)

    comparison = _require_object(payload.get("comparison_matrix"), "comparison_matrix")
    _require_list(comparison.get("dimensions"), "comparison_matrix.dimensions")
    rows = _require_list(comparison.get("rows"), "comparison_matrix.rows")
    for row in rows:
        if not isinstance(row, dict):
            raise ValueError("comparison_matrix.rows entries must be objects")
        row_id = str(row.get("id") or row.get("route_ref") or "(unknown)")
        _require_field(row, f"comparison row {row_id}", "id", "route_ref", "paper_refs")
        values = row.get("values")
        if not isinstance(values, dict) or not values:
            raise ValueError(f"comparison row {row_id} requires non-empty values")
        if not _has_non_empty_refs(row, "evidence_map_refs"):
            raise ValueError(f"comparison row {row_id} requires evidence_map_refs")
    _validate_nested_evidence_map_refs("comparison_matrix", comparison, known_candidates)

    debates = _require_list(payload.get("debates"), "debates")
    for debate in debates:
        if not isinstance(debate, dict):
            raise ValueError("debates entries must be objects")
        debate_id = str(debate.get("id") or debate.get("title") or "(unknown)")
        _require_field(debate, f"debate {debate_id}", "id", "title")
        _require_list(debate.get("positions"), f"debate {debate_id}.positions")
        _require_field(debate, f"debate {debate_id}", "evaluation_axis", "axis")
        _require_field(debate, f"debate {debate_id}", "current_judgment", "judgment")
        if not _has_non_empty_refs(debate, "evidence_map_refs"):
            raise ValueError(f"debate {debate_id} requires evidence_map_refs")
    _validate_evidence_map_refs("debates", debates, known_candidates)

    gaps = _require_list(payload.get("gaps"), "gaps")
    for gap in gaps:
        if not isinstance(gap, dict):
            raise ValueError("gaps entries must be objects")
        gap_id = str(gap.get("id") or gap.get("title") or "(unknown)")
        _require_field(gap, f"gap {gap_id}", "id", "title", "description")
        gap_type = _clean_text(gap.get("gap_type"))
        if gap_type not in VALID_GAP_TYPES:
            raise ValueError(f"gap {gap_id} requires valid gap_type: {', '.join(sorted(VALID_GAP_TYPES))}")
        _require_field(gap, f"gap {gap_id}", "severity", "priority")
        _require_field(gap, f"gap {gap_id}", "recommended_action", "next_step")
        if not _has_non_empty_refs(gap, "evidence_map_refs"):
            raise ValueError(f"gap {gap_id} requires evidence_map_refs")
    _validate_evidence_map_refs("gaps", gaps, known_candidates)

    review_outline = _require_object(payload.get("review_outline"), "review_outline")
    if not any(
        isinstance(review_outline.get(key), list) and review_outline.get(key)
        for key in ("introduction_logic", "related_work_logic", "body_sections")
    ):
        raise ValueError("review_outline requires introduction_logic, related_work_logic, or body_sections")
    _validate_nested_evidence_map_refs("review_outline", review_outline, known_candidates)


def validate_core_analytical_sections(conn, payload: dict, run_root: Path) -> dict:
    for key in ("claims", "debates", "gaps"):
        _require_list(payload.get(key), key)
    for key in ("comparison_matrix", "review_outline", "positioning"):
        _require_object(payload.get(key), key)
    _validate_core_sections_depth(conn, payload)
    relative_path = "runtime/payloads/core-analytical-sections.json"
    hash_value = write_json(run_root / relative_path, payload)
    register_artifact(
        conn,
        path=relative_path,
        hash_value=hash_value,
        content_type="json",
        schema_id="synthesis.core_analytical_sections",
        stage="stage_8_core_sections",
        validated=True,
    )
    set_meta(conn, "core_analytical_sections_path", relative_path)
    set_meta(conn, "core_analytical_sections_hash", hash_value)
    return {"path": relative_path, "hash": hash_value}


def read_section_files(run_root: Path, operation: str) -> dict:
    sections_root = run_root / "result" / "sections"
    selected = []
    for path in sorted(sections_root.glob("*.json")):
        selected.append(path.stem.replace("-", "_"))
    if operation != "update_patch":
        unknown = sorted(set(selected) - set(FULL_SECTIONS))
        if unknown:
            raise RuntimeError(
                "unknown_section_files: "
                + ", ".join(unknown)
                + "; remove legacy aliases and emit only canonical topic synthesis sections"
            )
    required = selected if operation == "update_patch" else list(FULL_SECTIONS)
    sections: dict[str, object] = {}
    missing = []
    for section_name in required:
        path = sections_root / safe_section_file(section_name)
        if not path.exists():
            missing.append(section_name)
            continue
        sections[section_name] = read_json_file(path)
    if missing:
        raise RuntimeError(f"missing_required_section_files: {', '.join(missing)}")
    return sections


def _load_validated_payload_artifact(
    conn,
    run_root: Path,
    *,
    path_meta: str,
    hash_meta: str,
    label: str,
) -> dict:
    relative_path = str(get_meta(conn, path_meta, "") or "")
    expected_hash = str(get_meta(conn, hash_meta, "") or "")
    if not relative_path or not expected_hash:
        raise RuntimeError(f"{label} must be validated before Stage 10")
    verify_registered_file_hash(conn, run_root, relative_path)
    actual_hash = sha256_file(run_root / relative_path)
    if actual_hash != expected_hash:
        raise RuntimeError(f"{label} hash drift: expected {expected_hash}, got {actual_hash}")
    value = read_json_file(run_root / relative_path)
    if not isinstance(value, dict):
        raise RuntimeError(f"{label} payload must be a JSON object")
    return value


def _current_sections_from_update_context(conn) -> dict:
    current_context = get_key_value(conn, "topic_intent", "current_context", {})
    if not isinstance(current_context, dict):
        return {}
    for key in ("sections", "artifact", "current_artifact", "topic_artifact"):
        candidate = current_context.get(key)
        if isinstance(candidate, dict):
            return {
                section_name: candidate[section_name]
                for section_name in FULL_SECTIONS
                if section_name in candidate
            }
    return {}


def _stage9_payload_sections(payload: dict, *, operation: str) -> dict:
    sections = payload.get("sections")
    if not isinstance(sections, dict):
        raise ValueError("persist_external_statistics_report payload must contain sections object")
    unknown = sorted(set(sections) - set(FULL_SECTIONS))
    if unknown:
        raise ValueError("persist_external_statistics_report sections contain unknown keys: " + ", ".join(unknown))
    protected = sorted(set(sections) & (set(ROUTE_TIMELINE_SECTIONS) | set(CORE_SECTIONS)))
    if protected:
        raise ValueError(
            "Stage 10 payload must not overwrite validated Stage 7/8 sections: "
            + ", ".join(protected)
        )
    if operation != "update_patch":
        missing = [name for name in STAGE9_AUTHORED_SECTIONS if name not in sections]
        if missing:
            raise ValueError(
                "persist_external_statistics_report.sections missing Stage 10 sections: "
                + ", ".join(missing)
            )
    elif not sections:
        raise ValueError("update_patch persist_external_statistics_report.sections must not be empty")
    return sections


def _merge_prevalidated_sections(conn, run_root: Path, stage9_sections: dict, *, operation: str) -> dict:
    route_timeline = _load_validated_payload_artifact(
        conn,
        run_root,
        path_meta="route_timeline_synthesis_path",
        hash_meta="route_timeline_synthesis_hash",
        label="route/timeline synthesis",
    )
    core_sections = _load_validated_payload_artifact(
        conn,
        run_root,
        path_meta="core_analytical_sections_path",
        hash_meta="core_analytical_sections_hash",
        label="core analytical sections",
    )
    sections: dict[str, object] = {}
    if operation == "update_patch":
        sections.update(_current_sections_from_update_context(conn))
    sections.update(stage9_sections)
    for section_name in ROUTE_TIMELINE_SECTIONS:
        if section_name in route_timeline:
            sections[section_name] = route_timeline[section_name]
    for section_name in CORE_SECTIONS:
        if section_name in core_sections:
            sections[section_name] = core_sections[section_name]
    return sections


def _materialize_section_files(run_root: Path, sections: dict) -> dict:
    result: dict[str, dict[str, str]] = {}
    for section_name in sorted(sections):
        relative_path = f"result/sections/{safe_section_file(section_name)}"
        hash_value = write_json(run_root / relative_path, sections[section_name])
        result[section_name] = {"path": relative_path, "hash": hash_value}
    return result


def persist_external_statistics_report_payload(
    conn,
    payload: dict,
    run_root: Path,
    *,
    operation: str,
    language: str,
) -> dict:
    stage9_sections = _stage9_payload_sections(payload, operation=operation)
    sections = _merge_prevalidated_sections(conn, run_root, stage9_sections, operation=operation)
    sections = inject_section_digest_refs(conn, sections)
    if operation != "update_patch":
        validate_topic_section_contract(conn, sections, require_complete=True)
        validate_topic_synthesis_artifact_schema(assemble_full_artifact(sections, language=language))
    else:
        validate_topic_section_contract(
            conn,
            sections,
            require_complete=all(section_name in sections for section_name in FULL_SECTIONS),
        )
    if "paper_evidence" in sections:
        validate_paper_evidence_against_bundles(conn, sections["paper_evidence"])
    materialized = _materialize_section_files(run_root, sections)
    return {
        "section_count": len(sections),
        "sections": sorted(sections),
        "materialized": materialized,
    }


def _topic_id(conn) -> str:
    topic_definition = get_key_value(conn, "topic_intent", "topic_definition", {})
    if isinstance(topic_definition, dict):
        return str(topic_definition.get("id") or "").strip()
    return ""


def _require_array(value: dict, key: str, *, label: str) -> list:
    rows = value.get(key)
    if rows is None:
        rows = []
    if not isinstance(rows, list):
        raise ValueError(f"{label}.{key} must be an array")
    return rows


def _normalize_concept_cards_sidecar(value: object, *, topic_id: str) -> dict:
    if not isinstance(value, dict):
        raise ValueError("kg_proposals.concept_cards_proposal must be an object")
    cards = _require_array(value, "cards", label="concept_cards_proposal")
    diagnostics = _require_array(value, "diagnostics", label="concept_cards_proposal")
    result = dict(value)
    result["schema_id"] = "synthesis.concept_cards_proposal"
    result["schema_version"] = str(result.get("schema_version") or "1.0.0")
    if topic_id and not str(result.get("topic_id") or "").strip():
        result["topic_id"] = topic_id
    result["cards"] = cards
    result["diagnostics"] = diagnostics
    return result


def _normalize_topic_graph_sidecar(value: object, *, topic_id: str) -> dict:
    if not isinstance(value, dict):
        raise ValueError("kg_proposals.topic_graph_relation_proposals must be an object")
    proposals = _require_array(value, "proposals", label="topic_graph_relation_proposals")
    diagnostics = _require_array(value, "diagnostics", label="topic_graph_relation_proposals")
    result = dict(value)
    result["schema_id"] = "synthesis.topic_graph_relation_proposals"
    result["schema_version"] = str(result.get("schema_version") or "1.0.0")
    if topic_id and not str(result.get("source_topic_id") or "").strip():
        result["source_topic_id"] = topic_id
    result["proposals"] = proposals
    result["diagnostics"] = diagnostics
    return result


def _normalize_topic_interest_metadata(value: object, *, topic_definition: dict) -> dict:
    if not isinstance(value, dict):
        raise ValueError("kg_proposals.topic_interest_metadata must be an object")
    return build_topic_interest_metadata(
        topic_definition,
        {"topic_interest_metadata": value},
    )


def persist_kg_proposals_payload(conn, payload: dict, run_root: Path) -> dict:
    if payload.get("schema_id") not in (None, "synthesis.topic_synthesis_kg_proposals"):
        raise ValueError("kg proposal payload schema_id must be synthesis.topic_synthesis_kg_proposals")
    if (
        "concept_cards_proposal" not in payload
        or "topic_graph_relation_proposals" not in payload
        or "topic_interest_metadata" not in payload
    ):
        raise ValueError(
            "kg proposal payload requires concept_cards_proposal, topic_graph_relation_proposals, and topic_interest_metadata"
        )
    topic_id = _topic_id(conn)
    topic_definition = get_key_value(conn, "topic_intent", "topic_definition", {})
    if not isinstance(topic_definition, dict):
        topic_definition = {"id": topic_id}
    concept_sidecar = _normalize_concept_cards_sidecar(
        payload.get("concept_cards_proposal", {}),
        topic_id=topic_id,
    )
    relation_sidecar = _normalize_topic_graph_sidecar(
        payload.get("topic_graph_relation_proposals", {}),
        topic_id=topic_id,
    )
    topic_interest_metadata = _normalize_topic_interest_metadata(
        payload.get("topic_interest_metadata", {}),
        topic_definition=topic_definition,
    )
    concept_hash = write_json(run_root / CONCEPT_CARDS_PROPOSAL_PATH, concept_sidecar)
    relation_hash = write_json(
        run_root / TOPIC_GRAPH_RELATION_PROPOSALS_PATH,
        relation_sidecar,
    )
    topic_interest_metadata_hash = write_json(
        run_root / TOPIC_INTEREST_METADATA_PATH,
        topic_interest_metadata,
    )
    register_artifact(
        conn,
        path=CONCEPT_CARDS_PROPOSAL_PATH,
        hash_value=concept_hash,
        content_type="json",
        schema_id="synthesis.concept_cards_proposal",
        stage="stage_9_kg_proposals",
        validated=True,
    )
    register_artifact(
        conn,
        path=TOPIC_GRAPH_RELATION_PROPOSALS_PATH,
        hash_value=relation_hash,
        content_type="json",
        schema_id="synthesis.topic_graph_relation_proposals",
        stage="stage_9_kg_proposals",
        validated=True,
    )
    register_artifact(
        conn,
        path=TOPIC_INTEREST_METADATA_PATH,
        hash_value=topic_interest_metadata_hash,
        content_type="json",
        schema_id="topic_interest_metadata.v1",
        stage="stage_9_kg_proposals",
        validated=True,
    )
    artifact_metadata = get_meta(conn, "artifact_metadata", {})
    if not isinstance(artifact_metadata, dict):
        artifact_metadata = {}
    artifact_metadata = dict(artifact_metadata)
    artifact_metadata["topic_interest_metadata"] = topic_interest_metadata
    set_meta(conn, "artifact_metadata", artifact_metadata)
    set_meta(conn, "concept_cards_proposal_path", CONCEPT_CARDS_PROPOSAL_PATH)
    set_meta(conn, "topic_graph_relation_proposals_path", TOPIC_GRAPH_RELATION_PROPOSALS_PATH)
    set_meta(conn, "topic_interest_metadata_path", TOPIC_INTEREST_METADATA_PATH)
    return {
        "concept_cards_proposal_path": CONCEPT_CARDS_PROPOSAL_PATH,
        "concept_cards_proposal_hash": concept_hash,
        "topic_graph_relation_proposals_path": TOPIC_GRAPH_RELATION_PROPOSALS_PATH,
        "topic_graph_relation_proposals_hash": relation_hash,
        "topic_interest_metadata_path": TOPIC_INTEREST_METADATA_PATH,
        "topic_interest_metadata_hash": topic_interest_metadata_hash,
    }


def _require_registered_sidecar(conn, run_root: Path, relative_path: str, *, label: str) -> str:
    path = run_root / relative_path
    if not path.exists():
        raise RuntimeError(f"{label} sidecar is required before final validation: {relative_path}")
    verify_registered_file_hash(conn, run_root, relative_path)
    return sha256_file(path)


def _is_final_rewrite_integrity_error(error: str) -> bool:
    if any(path in error for path in FINAL_REWRITE_PATHS):
        return True
    if "runtime_integrity_section_file_" in error and "result/sections/" in error:
        return True
    return (
        "runtime_integrity_non_monotonic_stage_state:" in error
        and "stage_11_render_and_validate=" in error
        and "before completed stage_12_completed" in error
    )


def _pre_final_integrity_errors(conn, run_root: Path) -> list[str]:
    return [
        error
        for error in audit_runtime_integrity(conn, run_root=run_root, strict_files=True)
        if not _is_final_rewrite_integrity_error(error)
    ]


def _post_final_integrity_check(conn, run_root: Path) -> None:
    errors = audit_runtime_integrity(conn, run_root=run_root, strict_files=True)
    if errors:
        raise RuntimeError("runtime_integrity_failed_after_final_write: " + "; ".join(errors))


def assemble_full_artifact(sections: dict, *, language: str) -> dict:
    return {
        "schema_id": "synthesis.topic_synthesis_artifact",
        "schema_version": "2.0.0",
        "language": language or "auto",
        **sections,
    }


def validate_final_artifacts(conn, run_root: Path, *, operation: str, language: str) -> dict:
    integrity_errors = _pre_final_integrity_errors(conn, run_root)
    if integrity_errors:
        raise RuntimeError("runtime_integrity_failed: " + "; ".join(integrity_errors))
    require_stage4_action_receipts_complete(conn)
    sections = read_section_files(run_root, operation)
    sections = inject_section_digest_refs(conn, sections)
    if operation != "update_patch":
        validate_topic_section_contract(conn, sections, require_complete=True)
        validate_topic_synthesis_artifact_schema(
            assemble_full_artifact(sections, language=language)
        )
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
    topic_definition = get_key_value(conn, "topic_intent", "topic_definition", {})
    if not isinstance(topic_definition, dict) or not str(topic_definition.get("id") or "").strip():
        raise ValueError("validate_final_artifacts requires topic_definition.id from stage_1_topic_intent")
    artifact_metadata = get_meta(conn, "artifact_metadata", {})
    topic_interest_metadata = build_topic_interest_metadata(topic_definition, artifact_metadata)
    topic_interest_metadata_hash = write_json(
        run_root / TOPIC_INTEREST_METADATA_PATH,
        topic_interest_metadata,
    )
    register_artifact(
        conn,
        path=TOPIC_INTEREST_METADATA_PATH,
        hash_value=topic_interest_metadata_hash,
        content_type="json",
        schema_id="topic_interest_metadata.v1",
        stage="stage_11_render_and_validate",
        validated=True,
    )
    topic_interest_metadata_manifest_entry = {
        "path": TOPIC_INTEREST_METADATA_PATH,
        "hash": topic_interest_metadata_hash,
        "content_type": "json",
        "schema_id": "topic_interest_metadata.v1",
    }
    concept_cards_proposal_hash = _require_registered_sidecar(
        conn,
        run_root,
        CONCEPT_CARDS_PROPOSAL_PATH,
        label="concept cards proposal",
    )
    topic_graph_relation_proposals_hash = _require_registered_sidecar(
        conn,
        run_root,
        TOPIC_GRAPH_RELATION_PROPOSALS_PATH,
        label="topic graph relation proposals",
    )
    sidecars_manifest = {
        "topic_interest_metadata": topic_interest_metadata_manifest_entry,
        "concept_cards_proposal": {
            "path": CONCEPT_CARDS_PROPOSAL_PATH,
            "hash": concept_cards_proposal_hash,
            "content_type": "json",
            "schema_id": "synthesis.concept_cards_proposal",
        },
        "topic_graph_relation_proposals": {
            "path": TOPIC_GRAPH_RELATION_PROPOSALS_PATH,
            "hash": topic_graph_relation_proposals_hash,
            "content_type": "json",
            "schema_id": "synthesis.topic_graph_relation_proposals",
        },
    }
    if operation == "update_patch":
        manifest = {
            "schema_id": "synthesis.topic_section_patch_manifest",
            "schema_version": "2.0.0",
            "operation": "update_patch",
            "language": language,
            "sidecars": sidecars_manifest,
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
            "sidecars": sidecars_manifest,
            "sections": manifest_sections,
        }
    manifest_hash = write_json(run_root / manifest_path, manifest)
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
        "artifact_metadata": artifact_metadata,
        "analysis_manifest_path": manifest_path,
    }
    if operation == "update_patch":
        final["topic_id"] = (
            topic_definition.get("id") if isinstance(topic_definition, dict) else None
        ) or get_meta(conn, "topic_id", "")
        final["read_section_hashes"] = get_meta(conn, "read_section_hashes", {})
    final_hash = write_json(run_root / "result/result.json", final)
    register_artifact(
        conn,
        path=manifest_path,
        hash_value=manifest_hash,
        content_type="json",
        schema_id=manifest["schema_id"],
        stage="stage_11_render_and_validate",
        validated=True,
    )
    register_artifact(
        conn,
        path="result/result.json",
        hash_value=final_hash,
        content_type="json",
        schema_id="synthesis.topic_synthesis_final_bundle",
        stage="stage_11_render_and_validate",
        validated=True,
    )
    set_stage_state(conn, "stage_11_render_and_validate", "completed")
    set_stage_state(conn, "stage_12_completed", "completed")
    _post_final_integrity_check(conn, run_root)
    return {
        "manifest_path": manifest_path,
        "manifest_hash": manifest_hash,
        "topic_interest_metadata_path": TOPIC_INTEREST_METADATA_PATH,
        "topic_interest_metadata_hash": topic_interest_metadata_hash,
        "final_path": "result/result.json",
        "final_hash": final_hash,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", default="runtime/topic-synthesis.sqlite")
    parser.add_argument("--run-root", default=".")
    parser.add_argument("--operation", default="update_full")
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
        set_stage_state(conn, "stage_12_completed", "canceled")
        canceled = {
            "kind": "topic_synthesis_canceled",
            "status": "canceled",
            "reason": "user_cancelled",
            "message": "Topic synthesis update was canceled.",
        }
        print(json.dumps(canceled, ensure_ascii=False, sort_keys=True))
        return
    if args.action == "audit_runtime_integrity":
        errors = audit_runtime_integrity(conn, run_root=Path(args.run_root), strict_files=True)
        result = {"ok": not errors, "errors": errors}
        print(json.dumps(result, ensure_ascii=False, sort_keys=True))
        if errors:
            raise SystemExit(1)
        return

    try:
        if args.action == "confirm_runtime_setup":
            payload = {
                "operation": args.operation,
                "language": "zh-CN" if args.language == "auto" else args.language,
                "run_root": str(Path(args.run_root).resolve()),
            }
            set_meta(conn, "operation", payload["operation"])
            set_meta(conn, "language", payload["language"])
            set_meta(conn, "run_root", payload["run_root"])
            set_stage_state(conn, "stage_0_runtime_setup", "completed")
            set_stage_state(conn, "stage_1_topic_context", "running")
            print(json.dumps(stage_result(conn, args.action, payload, payload), ensure_ascii=False, sort_keys=True))
            return

        if args.action in {"persist_topic_intent", "persist_topic_context"}:
            payload = require_payload(args)
            result = persist_topic_intent(conn, payload)
            set_stage_state(conn, "stage_0_runtime_setup", "completed")
            set_stage_state(conn, "stage_1_topic_context", "completed")
            set_stage_state(conn, "stage_2_resolver_and_workset", "running")
            print(json.dumps(stage_result(conn, args.action, payload, result), ensure_ascii=False, sort_keys=True))
            return

        if args.action == "persist_resolver":
            payload = require_payload(args)
            result = persist_resolver(conn, payload)
            set_stage_state(conn, "stage_2_resolver_and_workset", "completed")
            if result.get("paper_refs"):
                set_stage_state(conn, "stage_3_graph_metrics", "running")
            else:
                set_stage_state(conn, "stage_3_graph_metrics", "completed")
                set_stage_state(conn, "stage_4_evidence_collection", "completed")
                set_stage_state(conn, "stage_5_paper_units", "completed")
                set_stage_state(conn, "stage_6_cross_paper_map", "running")
            print(json.dumps(stage_result(conn, args.action, payload, result), ensure_ascii=False, sort_keys=True))
            return

        if args.action == "persist_citation_graph_metrics":
            payload = require_payload(args)
            result = persist_citation_graph_metrics(conn, payload)
            response = stage_result(conn, args.action, payload, result)
            if not missing_citation_graph_metric_receipt_refs(conn):
                set_stage_state(conn, "stage_3_graph_metrics", "completed")
                set_stage_state(conn, "stage_4_evidence_collection", "running")
            else:
                set_stage_state(conn, "stage_3_graph_metrics", "running")
            print(json.dumps(response, ensure_ascii=False, sort_keys=True))
            return

        if args.action == "persist_filtered_artifact_manifest":
            payload = require_payload(args)
            result = persist_filtered_artifact_manifest(conn, payload, run_root=args.run_root)
            response = stage_result(conn, args.action, payload, result)
            if not missing_paper_artifact_bundle_receipt_refs(conn):
                set_stage_state(conn, "stage_4_evidence_collection", "completed")
                set_stage_state(conn, "stage_5_paper_units", "running")
            else:
                set_stage_state(conn, "stage_4_evidence_collection", "running")
            print(json.dumps(response, ensure_ascii=False, sort_keys=True))
            return

        if args.action in {"persist_paper_analysis", "persist_paper_unit"}:
            if not args.paper_ref:
                raise SystemExit("--paper-ref is required for persist_paper_unit")
            payload = require_payload(args)
            result = persist_paper_analysis(conn, args.paper_ref, payload, run_root=args.run_root)
            if not missing_paper_analysis_refs(conn):
                set_stage_state(conn, "stage_5_paper_units", "completed")
                set_stage_state(conn, "stage_6_cross_paper_map", "running")
            else:
                set_stage_state(conn, "stage_5_paper_units", "running")
            print(json.dumps(stage_result(conn, args.action, payload, result), ensure_ascii=False, sort_keys=True))
            return

        if args.action in {"persist_paper_analyses", "persist_paper_units"}:
            payload = require_payload(args)
            result = persist_paper_analyses(conn, payload, run_root=args.run_root)
            if not missing_paper_analysis_refs(conn):
                set_stage_state(conn, "stage_5_paper_units", "completed")
                set_stage_state(conn, "stage_6_cross_paper_map", "running")
            else:
                set_stage_state(conn, "stage_5_paper_units", "running")
            print(json.dumps(stage_result(conn, args.action, payload, result), ensure_ascii=False, sort_keys=True))
            return

        if args.action == "export_cross_paper_context":
            result = export_cross_paper_context(conn, Path(args.run_root))
            set_stage_state(conn, "stage_6_cross_paper_map", "running")
            print(json.dumps(stage_result(conn, args.action, {}, result), ensure_ascii=False, sort_keys=True))
            return

        if args.action in {"validate_cross_paper_evidence_map", "persist_cross_paper_evidence_map"}:
            payload = require_payload(args)
            result = persist_cross_paper_evidence_map(conn, payload, run_root=args.run_root)
            set_stage_state(conn, "stage_6_cross_paper_map", "completed")
            set_stage_state(conn, "stage_7_route_timeline", "running")
            print(json.dumps(stage_result(conn, args.action, payload, result), ensure_ascii=False, sort_keys=True))
            return

        if args.action in {"validate_route_timeline_synthesis", "persist_route_timeline"}:
            payload = require_payload(args)
            result = validate_route_timeline_synthesis(conn, payload, Path(args.run_root))
            set_stage_state(conn, "stage_7_route_timeline", "completed")
            set_stage_state(conn, "stage_8_core_sections", "running")
            print(json.dumps(stage_result(conn, args.action, payload, result), ensure_ascii=False, sort_keys=True))
            return

        if args.action in {"validate_core_analytical_sections", "persist_core_sections"}:
            payload = require_payload(args)
            result = validate_core_analytical_sections(conn, payload, Path(args.run_root))
            set_stage_state(conn, "stage_8_core_sections", "completed")
            set_stage_state(conn, "stage_9_kg_proposals", "running")
            print(json.dumps(stage_result(conn, args.action, payload, result), ensure_ascii=False, sort_keys=True))
            return

        if args.action == "persist_kg_proposals":
            payload = require_payload(args)
            result = persist_kg_proposals_payload(conn, payload, Path(args.run_root))
            set_stage_state(conn, "stage_9_kg_proposals", "completed")
            set_stage_state(conn, "stage_10_external_statistics_report", "running")
            print(json.dumps(stage_result(conn, args.action, payload, result), ensure_ascii=False, sort_keys=True))
            return

        if args.action == "persist_external_statistics_report":
            operation = args.operation
            language = "zh-CN" if args.language == "auto" else args.language
            payload = require_payload(args)
            result = persist_external_statistics_report_payload(
                conn,
                payload,
                Path(args.run_root),
                operation=operation,
                language=language,
            )
            set_stage_state(conn, "stage_10_external_statistics_report", "completed")
            set_stage_state(conn, "stage_11_render_and_validate", "running")
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
        stage = action_stage(args.action)
        clear_failed_retryable(conn, stage)
        set_stage_state(conn, stage, "failed_retryable", error=str(error))
        raise


if __name__ == "__main__":
    main()
