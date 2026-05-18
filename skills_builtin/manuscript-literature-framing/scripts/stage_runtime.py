from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from runtime_state import (
    append_event,
    ensure_list,
    ensure_non_empty_string,
    read_payload,
    read_state,
    stable_hash,
    write_json,
    write_state,
    write_text,
)


def payload_file_required(action: str, payload_file: str | None) -> str:
    if not payload_file:
        raise ValueError(f"{action} requires --payload-file")
    return payload_file


def action_persist_manuscript_context(state: dict[str, Any], payload: dict[str, Any]) -> None:
    context = payload.get("manuscript_context", payload)
    if not isinstance(context, dict):
        raise ValueError("manuscript_context must be an object")
    ensure_non_empty_string(context.get("problem"), "problem")
    ensure_non_empty_string(context.get("method") or context.get("system"), "method/system")
    contributions = context.get("main_contributions") or context.get("contributions")
    if isinstance(contributions, str):
        contributions = [contributions]
    ensure_list(contributions, "main_contributions")
    context["main_contributions"] = [str(entry).strip() for entry in contributions if str(entry).strip()]
    if not context["main_contributions"]:
        raise ValueError("main_contributions must contain at least one entry")
    state["manuscript_context"] = context


def action_persist_topic_recommendations(state: dict[str, Any], payload: dict[str, Any]) -> None:
    topics = payload.get("topics") or payload.get("recommendations")
    topics = ensure_list(topics, "topics")
    normalized = []
    for entry in topics:
        if isinstance(entry, str):
            normalized.append({"topic_id": entry, "reason": ""})
        elif isinstance(entry, dict):
            topic_id = ensure_non_empty_string(entry.get("topic_id") or entry.get("id"), "topic_id")
            normalized.append({**entry, "topic_id": topic_id})
    state["topic_recommendations"] = normalized
    if not normalized:
        state["topic_recommendation_status"] = "none"


def action_confirm_topics(state: dict[str, Any], payload: dict[str, Any]) -> None:
    topic_ids = payload.get("topic_ids") or payload.get("confirmed_topics")
    topic_ids = [
        str(entry).strip()
        for entry in ensure_list(topic_ids, "topic_ids")
        if str(entry).strip()
    ]
    if not topic_ids:
        raise ValueError("topic_ids must contain at least one confirmed topic")
    state["confirmed_topics"] = topic_ids


def action_persist_review_inputs(state: dict[str, Any], payload: dict[str, Any]) -> None:
    review_inputs = payload.get("review_inputs") or payload.get("topics")
    review_inputs = ensure_list(review_inputs, "review_inputs")
    if not review_inputs:
        raise ValueError("review_inputs must not be empty")
    state["review_inputs"] = review_inputs
    state["review_inputs_hash"] = stable_hash(review_inputs)
    state["citation_map"] = payload.get("citation_map", {})
    state["evidence_diagnostics"] = payload.get("diagnostics", {})


def action_persist_writing_plan(state: dict[str, Any], payload: dict[str, Any]) -> None:
    plan = payload.get("writing_plan", payload)
    if not isinstance(plan, dict):
        raise ValueError("writing_plan must be an object")
    ensure_list(plan.get("introduction_plan"), "introduction_plan")
    ensure_list(plan.get("related_work_plan"), "related_work_plan")
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


def action_render_latex(state_path: str, state: dict[str, Any], payload: dict[str, Any]) -> None:
    if not state.get("writing_plan_confirmed"):
        raise ValueError("writing plan must be confirmed before render_latex")
    introduction = ensure_non_empty_string(
        payload.get("introduction_latex") or payload.get("introduction_tex"),
        "introduction_latex",
    )
    related = ensure_non_empty_string(
        payload.get("related_work_latex") or payload.get("related_work_tex"),
        "related_work_latex",
    )
    root = Path(state_path).parent.parent if Path(state_path).parent.name == "runtime" else Path(".")
    result_dir = root / "result"
    writing_plan = state.get("writing_plan") or {}
    citation_map = payload.get("citation_map") or state.get("citation_map") or {}
    diagnostics = payload.get("diagnostics") or state.get("evidence_diagnostics") or {}
    title = (
        payload.get("title")
        or state.get("manuscript_context", {}).get("title")
        or state.get("manuscript_context", {}).get("paperTitle")
        or state.get("paperTitle")
        or "Manuscript Literature Framing"
    )
    language = payload.get("language") or state.get("manuscript_context", {}).get("language") or "auto"
    topic_ids = state.get("confirmed_topics") or payload.get("topic_ids") or []
    result_json = {
        "__SKILL_DONE__": True,
        "kind": "writing.manuscript_literature_framing",
        "status": "completed",
        "title": str(title),
        "language": str(language),
        "assets": {
            "introduction_tex": "result/introduction.tex",
            "related_work_tex": "result/related-work.tex",
            "writing_plan": "result/writing-plan.json",
            "citation_map": "result/citation-map.json",
            "diagnostics": "result/diagnostics.json",
        },
        "topic_ids": topic_ids,
        "diagnostics_summary": summarize_diagnostics({"diagnostics": diagnostics}),
        "product_metadata": {
            "kind": "writing.manuscript_literature_framing",
            "title": str(title),
            "asset_count": 5,
        },
    }
    write_text(result_dir / "introduction.tex", introduction.rstrip() + "\n")
    write_text(result_dir / "related-work.tex", related.rstrip() + "\n")
    write_json(result_dir / "writing-plan.json", writing_plan if isinstance(writing_plan, dict) else {})
    write_json(result_dir / "citation-map.json", citation_map if isinstance(citation_map, dict) else {})
    write_json(result_dir / "diagnostics.json", diagnostics if isinstance(diagnostics, dict) else {})
    write_json(result_dir / "result.json", result_json)
    state["status"] = "completed"
    state["result"] = result_json


def action_cancel(state_path: str, state: dict[str, Any], payload: dict[str, Any]) -> None:
    reason = ensure_non_empty_string(payload.get("reason"), "reason")
    message = ensure_non_empty_string(payload.get("message"), "message")
    root = Path(state_path).parent.parent if Path(state_path).parent.name == "runtime" else Path(".")
    result_json = {
        "__SKILL_DONE__": True,
        "kind": "manuscript_literature_framing_canceled",
        "status": "canceled",
        "reason": reason,
        "message": message,
        "paperTitle": str(payload.get("paperTitle") or state.get("paperTitle") or ""),
    }
    write_json(root / "result" / "result.json", result_json)
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

    if args.action == "persist_manuscript_context":
        action_persist_manuscript_context(state, payload)
    elif args.action == "persist_topic_recommendations":
        action_persist_topic_recommendations(state, payload)
    elif args.action == "confirm_topics":
        action_confirm_topics(state, payload)
    elif args.action == "persist_review_inputs":
        action_persist_review_inputs(state, payload)
    elif args.action == "persist_writing_plan":
        action_persist_writing_plan(state, payload)
    elif args.action == "confirm_writing_plan":
        action_confirm_writing_plan(state, payload)
    elif args.action == "render_latex":
        action_render_latex(args.state, state, payload)
    elif args.action == "cancel":
        action_cancel(args.state, state, payload)
    else:
        raise ValueError(f"unsupported action: {args.action}")

    append_event(state, args.action)
    write_state(args.state, state)
    print(json.dumps({"ok": True, "action": args.action, "status": state.get("status", "running")}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
