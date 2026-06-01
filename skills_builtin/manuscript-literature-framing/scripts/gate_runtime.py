from __future__ import annotations

import argparse
import json
from pathlib import Path

from runtime_state import read_state


STATE_PATH = "runtime/manuscript-literature-framing.json"


def command(action: str, payload_name: str) -> str:
    return (
        f'python scripts/stage_runtime.py --state "{STATE_PATH}" '
        f'--action {action} --payload-file "runtime/payloads/{payload_name}.json"'
    )


def base_gate(state_path: str, state: dict) -> dict:
    return {
        "state_path": state_path,
        "status": state.get("status", "running"),
        "runtime_digest": {
            "discipline": "Run only the returned next_action, write state only through stage_runtime.py, and rerun gate after each write.",
            "stages": [
                "intent",
                "materials",
                "evidence",
                "multi_angle_analysis",
                "writing_plan",
                "final_drafting",
            ],
        },
    }


def next_step(state_path: str, state: dict, *, action: str, note: str, payload: str, **extra: object) -> dict:
    return {
        **base_gate(state_path, state),
        "next_action": action,
        "execution_note": note,
        "required_writes": [f"runtime/payloads/{payload}.json"],
        "command_example": command(action, payload),
        **extra,
    }


def build_gate(state_path: str) -> dict:
    state = read_state(state_path)
    if state.get("status") in {"completed", "canceled"}:
        return {
            **base_gate(state_path, state),
            "next_action": "done",
            "execution_note": "Final result has already been written.",
            "command_example": "",
        }

    if not state.get("intent_brief"):
        return next_step(
            state_path,
            state,
            action="persist_intent_brief",
            payload="intent-brief",
            note=(
                "Clarify the manuscript intent before touching literature evidence: research problem, "
                "object/scenario, method/system, contributions, target venue/style, output language, "
                "whether Related Work is separate, and preferred organization mode."
            ),
            interaction_required=True,
        )
    if not state.get("intent_confirmed"):
        return next_step(
            state_path,
            state,
            action="confirm_intent",
            payload="confirmed-intent",
            note="Ask the user to approve or revise the intent brief before collecting literature materials.",
            interaction_required=True,
        )
    if not state.get("material_plan"):
        return next_step(
            state_path,
            state,
            action="persist_material_plan",
            payload="material-plan",
            note=(
                "Call synthesis.list_topics, optionally inspect Zotero coverage, then write a material "
                "collection plan with 1-5 topic recommendations and rationale."
            ),
            required_reads=["synthesis.list_topics", "list_library_items", "search_items"],
        )
    if not state.get("material_scope_confirmed"):
        return next_step(
            state_path,
            state,
            action="confirm_material_scope",
            payload="confirmed-material-scope",
            note="Ask the user to confirm topic ids and any extra material boundaries before reading review inputs.",
            interaction_required=True,
        )
    if not state.get("evidence_inventory"):
        return next_step(
            state_path,
            state,
            action="persist_evidence_inventory",
            payload="evidence-inventory",
            note=(
                "For confirmed topics call synthesis.get_review_input. Use registry, graph, digest, "
                "and Zotero item tools only to fill citekeys, inspect core evidence, or resolve ambiguity."
            ),
            required_reads=[
                "synthesis.get_review_input",
                "synthesis.get_reference_sidecar_index",
                "synthesis.get_citation_graph_metrics",
                "synthesis.get_citation_graph_slice",
                "synthesis.resolve_topic_paper_digest",
                "get_item_detail",
                "prepare_paper_reading_context",
            ],
        )
    if not state.get("domain_route_analysis"):
        return next_step(
            state_path,
            state,
            action="persist_domain_route_analysis",
            payload="domain-route-analysis",
            note=(
                "Analyze the domain and method-route structure: stable taxonomy, method lines, "
                "benchmark/evaluation axes, debates, and representative citation candidates."
            ),
        )
    if not state.get("timeline_analysis"):
        return next_step(
            state_path,
            state,
            action="persist_timeline_analysis",
            payload="timeline-analysis",
            note=(
                "Analyze temporal structure only where it explains the field: foundations, turning points, "
                "recent frontier, and whether the manuscript is timely."
            ),
        )
    if not state.get("gap_alignment_analysis"):
        return next_step(
            state_path,
            state,
            action="persist_gap_alignment_analysis",
            payload="gap-alignment-analysis",
            note=(
                "Align evidence-backed gaps with the manuscript contribution. Each gap must bind to data, "
                "method, scenario, evaluation, theory, or integration boundary."
            ),
        )
    if not state.get("framing_synthesis"):
        return next_step(
            state_path,
            state,
            action="persist_framing_synthesis",
            payload="framing-synthesis",
            note=(
                "Synthesize the approved framing strategy: Introduction functional chain, Related Work "
                "organization axis, survey-of-surveys decision, and citation balance risks."
            ),
            required_reads=["references/scientific_introduction_related_work_writing_guide_zh.md"],
        )
    if not state.get("writing_plan"):
        return next_step(
            state_path,
            state,
            action="persist_writing_plan",
            payload="writing-plan",
            note=(
                "Read the writing guide, then draft a structured plan. Do not write final LaTeX yet. "
                "Each paragraph needs function, claim, evidence, citation candidates, topic provenance, "
                "and contribution alignment."
            ),
            required_reads=["references/scientific_introduction_related_work_writing_guide_zh.md"],
        )
    if not state.get("writing_plan_confirmed"):
        return next_step(
            state_path,
            state,
            action="confirm_writing_plan",
            payload="confirmed-writing-plan",
            note="Ask the user to approve or revise the writing plan before final draft composition.",
            interaction_required=True,
        )
    return next_step(
        state_path,
        state,
        action="persist_final_draft",
        payload="final-draft",
        note=(
            "Compose the final Introduction and Related Work LaTeX as an agent-authored draft from "
            "the confirmed plan, evidence inventory, and framing analysis. The script only persists "
            "the draft and result assets. Use real \\cite{zotero_citekey}; use % TODO citation: "
            "paper_ref for missing citekeys."
        ),
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--state", default=STATE_PATH)
    args = parser.parse_args()
    Path(args.state).parent.mkdir(parents=True, exist_ok=True)
    print(json.dumps(build_gate(args.state), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
