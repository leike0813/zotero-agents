from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from runtime_state import (
    append_event,
    ensure_list,
    ensure_non_empty_string,
    ensure_object,
    normalize_string_list,
    read_payload,
    read_state,
    stable_hash,
    write_json,
    write_state,
    write_text,
)

FALLBACK_RESULT_FILENAME = "manuscript-literature-framing.result.json"


def payload_file_required(action: str, payload_file: str | None) -> str:
    if not payload_file:
        raise ValueError(f"{action} requires --payload-file")
    return payload_file


def root_for_state(state_path: str) -> Path:
    state_parent = Path(state_path).parent
    if state_parent.name == "runtime":
        return state_parent.parent
    return Path(".")


def payload_object(payload: dict[str, Any], key: str, label: str) -> dict[str, Any]:
    return ensure_object(payload.get(key, payload), label)


def normalize_contributions(value: Any) -> list[str]:
    if isinstance(value, str):
        value = [value]
    return normalize_string_list(value, "main_contributions")


def normalize_topics(value: Any) -> list[dict[str, Any]]:
    topics = ensure_list(value, "topics")
    normalized: list[dict[str, Any]] = []
    for entry in topics:
        if isinstance(entry, str):
            normalized.append({"topic_id": entry.strip(), "reason": ""})
        elif isinstance(entry, dict):
            topic_id = ensure_non_empty_string(entry.get("topic_id") or entry.get("id"), "topic_id")
            normalized.append({**entry, "topic_id": topic_id})
        else:
            raise ValueError("topics entries must be strings or objects")
    normalized = [entry for entry in normalized if entry.get("topic_id")]
    if not normalized:
        raise ValueError("topics must contain at least one recommendation")
    if len(normalized) > 5:
        raise ValueError("topics must contain at most five recommendations")
    return normalized


def render_value(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True)


def first_present(mapping: dict[str, Any], names: list[str]) -> Any:
    for name in names:
        if name in mapping:
            return mapping.get(name)
    return None


def is_non_empty_value(value: Any) -> bool:
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, (list, tuple, set, dict)):
        return bool(value)
    return value is not None


def require_field_group(mapping: dict[str, Any], label: str, names: list[str]) -> None:
    value = first_present(mapping, names)
    if not is_non_empty_value(value):
        joined = ", ".join(names)
        raise ValueError(f"{label} requires one of: {joined}")


def validate_analysis_payload(key: str, analysis: dict[str, Any]) -> None:
    requirements = {
        "domain_route_analysis": [
            (
                "domain_route_analysis.taxonomy",
                ["taxonomy", "taxonomies", "domain_taxonomy", "route_taxonomy"],
            ),
            (
                "domain_route_analysis.method_lines",
                ["method_lines", "method_routes", "routes", "approach_families"],
            ),
            (
                "domain_route_analysis.citation_candidates",
                ["citation_candidates", "representative_citations", "representative_papers"],
            ),
        ],
        "timeline_analysis": [
            (
                "timeline_analysis.temporal_rationale",
                ["temporal_rationale", "timeline_rationale", "timeliness", "timeline_decision"],
            ),
            (
                "timeline_analysis.events",
                ["events", "milestones", "foundations", "turning_points", "frontier"],
            ),
        ],
        "gap_alignment_analysis": [
            ("gap_alignment_analysis.gaps", ["gaps", "gap_candidates", "evidence_backed_gaps"]),
            (
                "gap_alignment_analysis.contribution_alignment",
                ["contribution_alignment", "contribution_map", "alignment"],
            ),
        ],
        "framing_synthesis": [
            (
                "framing_synthesis.introduction_chain",
                ["introduction_chain", "intro_chain", "introduction_functional_chain"],
            ),
            (
                "framing_synthesis.related_work_organization",
                ["related_work_organization", "related_work_axis", "organization_axis"],
            ),
            (
                "framing_synthesis.citation_risks",
                ["citation_risks", "citation_balance_risks", "diagnostics"],
            ),
        ],
    }
    for label, names in requirements.get(key, []):
        require_field_group(analysis, label, names)


def paragraph_value(paragraph: dict[str, Any], names: list[str]) -> Any:
    return first_present(paragraph, names)


def validate_plan_paragraphs(paragraphs: list[Any], label: str) -> None:
    field_groups = [
        ("function", ["function", "paragraph_function", "role", "purpose"]),
        ("claim", ["claim", "core_claim", "argument", "core_argument"]),
        ("evidence", ["evidence", "evidence_sources", "source_evidence"]),
        (
            "citation candidates",
            ["citation_candidates", "candidate_citations", "citations", "references"],
        ),
        ("topic provenance", ["topic_provenance", "topic_sources", "provenance"]),
        (
            "contribution alignment",
            ["contribution_alignment", "contribution_map", "manuscript_alignment"],
        ),
    ]
    for index, entry in enumerate(paragraphs, start=1):
        if not isinstance(entry, dict):
            raise ValueError(f"{label}[{index}] must be an object")
        for field_label, names in field_groups:
            if not is_non_empty_value(paragraph_value(entry, names)):
                raise ValueError(f"{label}[{index}] requires {field_label}")


def render_runtime_views(state_path: str, state: dict[str, Any]) -> None:
    views_dir = root_for_state(state_path) / "runtime" / "views"
    intent = state.get("intent_brief") or state.get("manuscript_context") or {}
    material = {
        "material_plan": state.get("material_plan"),
        "confirmed_topics": state.get("confirmed_topics"),
        "material_scope_confirmed": state.get("material_scope_confirmed"),
    }
    evidence = {
        "evidence_inventory": state.get("evidence_inventory"),
        "citation_map": state.get("citation_map"),
        "evidence_diagnostics": state.get("evidence_diagnostics"),
    }
    analysis = {
        "domain_route_analysis": state.get("domain_route_analysis"),
        "timeline_analysis": state.get("timeline_analysis"),
        "gap_alignment_analysis": state.get("gap_alignment_analysis"),
        "framing_synthesis": state.get("framing_synthesis"),
    }
    writing = {
        "writing_plan": state.get("writing_plan"),
        "writing_plan_confirmed": state.get("writing_plan_confirmed"),
    }
    write_text(views_dir / "01-intent-brief.md", "# Intent Brief\n\n```json\n" + render_value(intent) + "\n```\n")
    write_text(views_dir / "02-material-scope.md", "# Material Scope\n\n```json\n" + render_value(material) + "\n```\n")
    write_text(views_dir / "03-evidence-inventory.md", "# Evidence Inventory\n\n```json\n" + render_value(evidence) + "\n```\n")
    write_text(views_dir / "04-framing-analysis.md", "# Framing Analysis\n\n```json\n" + render_value(analysis) + "\n```\n")
    write_text(views_dir / "05-writing-plan.md", "# Writing Plan\n\n```json\n" + render_value(writing) + "\n```\n")


def action_persist_intent_brief(state: dict[str, Any], payload: dict[str, Any]) -> None:
    brief = payload_object(payload, "intent_brief", "intent_brief")
    title = brief.get("paperTitle") or brief.get("title") or payload.get("paperTitle")
    if title:
        brief["paperTitle"] = str(title).strip()
    ensure_non_empty_string(brief.get("problem") or brief.get("research_problem"), "research_problem")
    ensure_non_empty_string(
        brief.get("target_object") or brief.get("scenario") or brief.get("object_or_scenario"),
        "object_or_scenario",
    )
    ensure_non_empty_string(brief.get("method") or brief.get("system") or brief.get("method_or_system"), "method_or_system")
    contributions = brief.get("main_contributions") or brief.get("contributions")
    brief["main_contributions"] = normalize_contributions(contributions)
    state["intent_brief"] = brief
    state["intent_brief_hash"] = stable_hash(brief)
    state["intent_confirmed"] = False
    state["manuscript_context"] = brief


def action_confirm_intent(state: dict[str, Any], payload: dict[str, Any]) -> None:
    if payload.get("intent_brief"):
        action_persist_intent_brief(state, payload)
    if payload.get("approved") is not True and payload.get("status") != "approved":
        raise ValueError("intent confirmation requires approved=true")
    if not state.get("intent_brief"):
        raise ValueError("intent_brief must be persisted before confirmation")
    state["intent_confirmed"] = True
    state["intent_confirmation"] = payload


def action_persist_material_plan(state: dict[str, Any], payload: dict[str, Any]) -> None:
    plan = payload_object(payload, "material_plan", "material_plan")
    topics = plan.get("topics") or plan.get("topic_recommendations") or payload.get("topics") or payload.get("recommendations")
    recommendations = normalize_topics(topics)
    plan["topic_recommendations"] = recommendations
    plan.setdefault("selection_rationale", payload.get("selection_rationale", ""))
    state["material_plan"] = plan
    state["topic_recommendations"] = recommendations
    state["material_plan_hash"] = stable_hash(plan)
    state["material_scope_confirmed"] = False


def action_confirm_material_scope(state: dict[str, Any], payload: dict[str, Any]) -> None:
    if payload.get("approved") is not True and payload.get("status") not in {"approved", "confirmed"}:
        raise ValueError("material scope confirmation requires approved=true")
    topic_ids = payload.get("topic_ids") or payload.get("confirmed_topics")
    state["confirmed_topics"] = normalize_string_list(topic_ids, "topic_ids")
    state["material_scope_confirmed"] = True
    state["material_scope_confirmation"] = payload


def action_persist_evidence_inventory(state: dict[str, Any], payload: dict[str, Any]) -> None:
    inventory = payload_object(payload, "evidence_inventory", "evidence_inventory")
    review_inputs = inventory.get("review_inputs") or payload.get("review_inputs") or payload.get("topics")
    if review_inputs is not None:
        inventory["review_inputs"] = ensure_list(review_inputs, "review_inputs")
    if not inventory.get("review_inputs"):
        raise ValueError("evidence_inventory.review_inputs must not be empty")
    state["evidence_inventory"] = inventory
    state["review_inputs"] = inventory["review_inputs"]
    state["review_inputs_hash"] = stable_hash(inventory["review_inputs"])
    state["citation_map"] = payload.get("citation_map") or inventory.get("citation_map") or {}
    state["evidence_diagnostics"] = payload.get("diagnostics") or inventory.get("diagnostics") or {}
    state["evidence_inventory_hash"] = stable_hash(inventory)


def action_persist_named_analysis(state: dict[str, Any], payload: dict[str, Any], key: str) -> None:
    analysis = payload_object(payload, key, key)
    validate_analysis_payload(key, analysis)
    state[key] = analysis
    state[f"{key}_hash"] = stable_hash(analysis)


def action_persist_writing_plan(state: dict[str, Any], payload: dict[str, Any]) -> None:
    plan = payload_object(payload, "writing_plan", "writing_plan")
    introduction_plan = ensure_list(plan.get("introduction_plan"), "introduction_plan")
    related_work_plan = ensure_list(plan.get("related_work_plan"), "related_work_plan")
    if not introduction_plan:
        raise ValueError("introduction_plan must not be empty")
    if not related_work_plan:
        raise ValueError("related_work_plan must not be empty")
    validate_plan_paragraphs(introduction_plan, "introduction_plan")
    validate_plan_paragraphs(related_work_plan, "related_work_plan")
    if not plan.get("framing_strategy"):
        plan["framing_strategy"] = state.get("framing_synthesis", {})
    state["writing_plan"] = plan
    state["writing_plan_hash"] = stable_hash(plan)
    state["writing_plan_confirmed"] = False


def action_confirm_writing_plan(state: dict[str, Any], payload: dict[str, Any]) -> None:
    if payload.get("approved") is not True and payload.get("status") != "approved":
        raise ValueError("writing plan confirmation requires approved=true")
    state["writing_plan_confirmed"] = True
    state["writing_plan_confirmation"] = payload


def summarize_diagnostics(payload: dict[str, Any]) -> dict[str, Any]:
    diagnostics = payload.get("diagnostics")
    if not isinstance(diagnostics, dict):
        diagnostics = {}
    missing = diagnostics.get("missing_citekeys", [])
    warnings = diagnostics.get("warnings", [])
    if not isinstance(missing, list):
        missing = []
    if not isinstance(warnings, list):
        warnings = []
    return {
        "missing_citekeys": len(missing),
        "warnings": warnings,
    }


def build_framing_analysis(state: dict[str, Any]) -> dict[str, Any]:
    return {
        "domain_route_analysis": state.get("domain_route_analysis") or {},
        "timeline_analysis": state.get("timeline_analysis") or {},
        "gap_alignment_analysis": state.get("gap_alignment_analysis") or {},
        "framing_synthesis": state.get("framing_synthesis") or {},
    }


def action_persist_final_draft(state_path: str, state: dict[str, Any], payload: dict[str, Any]) -> None:
    if not state.get("writing_plan_confirmed"):
        raise ValueError("writing plan must be confirmed before persist_final_draft")
    introduction = ensure_non_empty_string(
        payload.get("introduction_latex") or payload.get("introduction_tex"),
        "introduction_latex",
    )
    related = ensure_non_empty_string(
        payload.get("related_work_latex") or payload.get("related_work_tex"),
        "related_work_latex",
    )
    root = root_for_state(state_path)
    result_dir = root / "result"
    intent_brief = state.get("intent_brief") or state.get("manuscript_context") or {}
    evidence_inventory = state.get("evidence_inventory") or {}
    framing_analysis = build_framing_analysis(state)
    writing_plan = state.get("writing_plan") or {}
    citation_map = payload.get("citation_map") or state.get("citation_map") or {}
    diagnostics = payload.get("diagnostics") or state.get("evidence_diagnostics") or {}
    title = (
        payload.get("title")
        or intent_brief.get("title")
        or intent_brief.get("paperTitle")
        or state.get("paperTitle")
        or "Manuscript Literature Framing"
    )
    language = payload.get("language") or intent_brief.get("language") or "auto"
    topic_ids = state.get("confirmed_topics") or payload.get("topic_ids") or []
    assets = {
        "introduction_tex": "result/introduction.tex",
        "related_work_tex": "result/related-work.tex",
        "intent_brief": "result/intent-brief.json",
        "evidence_inventory": "result/evidence-inventory.json",
        "framing_analysis": "result/framing-analysis.json",
        "writing_plan": "result/writing-plan.json",
        "citation_map": "result/citation-map.json",
        "diagnostics": "result/diagnostics.json",
    }
    result_json = {
        "kind": "writing.manuscript_literature_framing",
        "status": "completed",
        "title": str(title),
        "language": str(language),
        "assets": assets,
        "topic_ids": topic_ids,
        "diagnostics_summary": summarize_diagnostics({"diagnostics": diagnostics}),
        "product_metadata": {
            "kind": "writing.manuscript_literature_framing",
            "title": str(title),
            "asset_count": len(assets),
        },
    }
    write_text(result_dir / "introduction.tex", introduction.rstrip() + "\n")
    write_text(result_dir / "related-work.tex", related.rstrip() + "\n")
    write_json(result_dir / "intent-brief.json", intent_brief if isinstance(intent_brief, dict) else {})
    write_json(result_dir / "evidence-inventory.json", evidence_inventory if isinstance(evidence_inventory, dict) else {})
    write_json(result_dir / "framing-analysis.json", framing_analysis)
    write_json(result_dir / "writing-plan.json", writing_plan if isinstance(writing_plan, dict) else {})
    write_json(result_dir / "citation-map.json", citation_map if isinstance(citation_map, dict) else {})
    write_json(result_dir / "diagnostics.json", diagnostics if isinstance(diagnostics, dict) else {})
    write_json(root / FALLBACK_RESULT_FILENAME, result_json)
    state["status"] = "completed"
    state["result"] = result_json


def action_cancel(state_path: str, state: dict[str, Any], payload: dict[str, Any]) -> None:
    reason = ensure_non_empty_string(payload.get("reason"), "reason")
    message = ensure_non_empty_string(payload.get("message"), "message")
    root = root_for_state(state_path)
    result_json = {
        "kind": "manuscript_literature_framing_canceled",
        "status": "canceled",
        "reason": reason,
        "message": message,
        "paperTitle": str(payload.get("paperTitle") or state.get("paperTitle") or ""),
    }
    write_json(root / FALLBACK_RESULT_FILENAME, result_json)
    state["status"] = "canceled"
    state["result"] = result_json


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--state", default="runtime/manuscript-literature-framing.json")
    parser.add_argument("--action", required=True)
    parser.add_argument("--payload-file")
    args = parser.parse_args()
    state = read_state(args.state)
    payload: dict[str, Any] = {}
    if args.action != "show":
        payload_path = payload_file_required(args.action, args.payload_file)
        payload = read_payload(payload_path)

    if args.action in {"persist_intent_brief", "persist_manuscript_context"}:
        action_persist_intent_brief(state, payload)
    elif args.action == "confirm_intent":
        action_confirm_intent(state, payload)
    elif args.action in {"persist_material_plan", "persist_topic_recommendations"}:
        action_persist_material_plan(state, payload)
    elif args.action in {"confirm_material_scope", "confirm_topics"}:
        action_confirm_material_scope(state, payload)
    elif args.action in {"persist_evidence_inventory", "persist_review_inputs"}:
        action_persist_evidence_inventory(state, payload)
    elif args.action == "persist_domain_route_analysis":
        action_persist_named_analysis(state, payload, "domain_route_analysis")
    elif args.action == "persist_timeline_analysis":
        action_persist_named_analysis(state, payload, "timeline_analysis")
    elif args.action == "persist_gap_alignment_analysis":
        action_persist_named_analysis(state, payload, "gap_alignment_analysis")
    elif args.action == "persist_framing_synthesis":
        action_persist_named_analysis(state, payload, "framing_synthesis")
    elif args.action == "persist_writing_plan":
        action_persist_writing_plan(state, payload)
    elif args.action == "confirm_writing_plan":
        action_confirm_writing_plan(state, payload)
    elif args.action in {"persist_final_draft", "render_latex"}:
        action_persist_final_draft(args.state, state, payload)
    elif args.action == "cancel":
        action_cancel(args.state, state, payload)
    else:
        raise ValueError(f"unsupported action: {args.action}")

    append_event(state, args.action)
    render_runtime_views(args.state, state)
    write_state(args.state, state)
    print(json.dumps({"ok": True, "action": args.action, "status": state.get("status", "running")}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
