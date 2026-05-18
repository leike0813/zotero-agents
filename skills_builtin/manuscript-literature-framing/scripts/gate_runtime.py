from __future__ import annotations

import argparse
import json
from pathlib import Path

from runtime_state import read_state


def build_gate(state_path: str) -> dict:
    state = read_state(state_path)
    base = {
        "state_path": state_path,
        "status": state.get("status", "running"),
    }
    if state.get("status") in {"completed", "canceled"}:
        return {
            **base,
            "next_action": "done",
            "execution_note": "Final result has already been rendered.",
            "command_example": "",
        }
    if not state.get("manuscript_context"):
        return {
            **base,
            "next_action": "collect_manuscript_context",
            "execution_note": "Ask the user for manuscript context: problem, target object/scenario, method/system, main contributions, target venue/style, whether Related Work is separate, and preferred organization mode.",
            "required_writes": ["runtime/payloads/manuscript-context.json"],
            "command_example": 'python scripts/stage_runtime.py --state "runtime/manuscript-literature-framing.json" --action persist_manuscript_context --payload-file "runtime/payloads/manuscript-context.json"',
        }
    if not state.get("topic_recommendations"):
        return {
            **base,
            "next_action": "recommend_topics",
            "execution_note": "Call synthesis.list_topics, optionally use list_library_items/search_items for coverage checks, then write 1-5 topic recommendations. If no adequate topic exists, return pending/canceled suggesting topic synthesis creation.",
            "required_reads": ["synthesis.list_topics"],
            "required_writes": ["runtime/payloads/topic-recommendations.json"],
            "command_example": 'python scripts/stage_runtime.py --state "runtime/manuscript-literature-framing.json" --action persist_topic_recommendations --payload-file "runtime/payloads/topic-recommendations.json"',
        }
    if not state.get("confirmed_topics"):
        return {
            **base,
            "next_action": "confirm_topics",
            "execution_note": "Ask the user to confirm topic ids before reading review input.",
            "required_writes": ["runtime/payloads/confirmed-topics.json"],
            "command_example": 'python scripts/stage_runtime.py --state "runtime/manuscript-literature-framing.json" --action confirm_topics --payload-file "runtime/payloads/confirmed-topics.json"',
        }
    if not state.get("review_inputs"):
        return {
            **base,
            "next_action": "ingest_review_inputs",
            "execution_note": "For confirmed topics call synthesis.get_review_input. Use registry, graph, digest, and Zotero item tools only to fill citekeys or inspect key evidence.",
            "required_reads": [
                "synthesis.get_review_input",
                "synthesis.get_paper_registry",
                "synthesis.get_citation_graph_metrics",
                "synthesis.get_citation_graph_slice",
                "synthesis.resolve_topic_paper_digest",
                "get_item_detail",
                "prepare_paper_reading_context",
            ],
            "required_writes": ["runtime/payloads/review-inputs.json"],
            "command_example": 'python scripts/stage_runtime.py --state "runtime/manuscript-literature-framing.json" --action persist_review_inputs --payload-file "runtime/payloads/review-inputs.json"',
        }
    if not state.get("writing_plan"):
        return {
            **base,
            "next_action": "draft_writing_plan",
            "execution_note": "Read references/scientific_introduction_related_work_writing_guide_zh.md, then draft a structured plan with Introduction functional chain, Related Work taxonomy/method lines/benchmark dimensions/debates, survey-of-surveys decision, paragraph purpose, claims, citation candidates, topic provenance, and contribution alignment. Do not write final LaTeX yet.",
            "required_reads": ["references/scientific_introduction_related_work_writing_guide_zh.md"],
            "required_writes": ["runtime/payloads/writing-plan.json"],
            "command_example": 'python scripts/stage_runtime.py --state "runtime/manuscript-literature-framing.json" --action persist_writing_plan --payload-file "runtime/payloads/writing-plan.json"',
        }
    if not state.get("writing_plan_confirmed"):
        return {
            **base,
            "next_action": "confirm_writing_plan",
            "execution_note": "Ask the user to confirm or revise the writing plan before final LaTeX rendering.",
            "required_writes": ["runtime/payloads/confirmed-writing-plan.json"],
            "command_example": 'python scripts/stage_runtime.py --state "runtime/manuscript-literature-framing.json" --action confirm_writing_plan --payload-file "runtime/payloads/confirmed-writing-plan.json"',
        }
    return {
        **base,
        "next_action": "render_latex",
        "execution_note": "Write final Introduction and Related Work LaTeX payload. Use real \\cite{zotero_citekey}; use % TODO citation: paper_ref for missing citekeys.",
        "required_writes": ["runtime/payloads/final-latex.json"],
        "command_example": 'python scripts/stage_runtime.py --state "runtime/manuscript-literature-framing.json" --action render_latex --payload-file "runtime/payloads/final-latex.json"',
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--state", default="runtime/manuscript-literature-framing.json")
    args = parser.parse_args()
    Path(args.state).parent.mkdir(parents=True, exist_ok=True)
    print(json.dumps(build_gate(args.state), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
