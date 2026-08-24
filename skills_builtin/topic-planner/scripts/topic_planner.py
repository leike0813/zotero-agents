from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any


STATES = {"materialized_covered", "planned_covered", "uncovered", "indeterminate"}
ACTIONS = {"create", "update", "mark_stale", "reactivate"}
RELATIONS = {"broader_than", "related_to", "overlaps_with", "contrasts_with"}
MEMBERSHIP_KEYS = {"paper_ids", "papers", "members", "paper_refs"}


def load_object(path: str) -> dict[str, Any]:
    value = json.loads(Path(path).read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return value


def clean(value: Any) -> str:
    return str(value or "").strip()


def paper_ref(row: dict[str, Any]) -> str:
    return clean(row.get("paper_ref") or row.get("paperRef"))


def validate_context(context: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    if context.get("schema_id") != "synthesis.topic_planning_context":
        raise ValueError("context schema_id must be synthesis.topic_planning_context")
    library = context.get("library")
    graph = context.get("topic_graph")
    if not isinstance(library, dict) or not clean(library.get("index_hash")):
        raise ValueError("context library.index_hash is required")
    if not isinstance(graph, dict) or not isinstance(graph.get("manifest"), dict):
        raise ValueError("context topic_graph.manifest is required")
    if not clean(graph["manifest"].get("manifest_hash")):
        raise ValueError("context graph manifest_hash is required")
    papers = library.get("papers")
    if not isinstance(papers, list):
        raise ValueError("context library.papers must be an array")
    refs = [paper_ref(row) for row in papers if isinstance(row, dict)]
    if len(refs) != len(papers) or not all(refs) or len(refs) != len(set(refs)):
        raise ValueError("context papers require unique non-empty paper_ref values")
    diagnostics = context.get("diagnostics")
    if isinstance(diagnostics, dict) and diagnostics.get("truncated") is True:
        raise ValueError("planning context is truncated; request an outputPath snapshot")
    return library, graph


def summarize(context: dict[str, Any], batch_size: int) -> dict[str, Any]:
    library, graph = validate_context(context)
    papers = sorted(library["papers"], key=paper_ref)
    topics = context.get("topics") if isinstance(context.get("topics"), list) else []
    batches = [
        [paper_ref(row) for row in papers[start : start + batch_size]]
        for start in range(0, len(papers), batch_size)
    ]
    lifecycle_counts: dict[str, int] = {}
    for topic in topics:
        if not isinstance(topic, dict):
            continue
        lifecycle = clean(topic.get("lifecycle")) or "unknown"
        lifecycle_counts[lifecycle] = lifecycle_counts.get(lifecycle, 0) + 1
    return {
        "library_index_hash": library["index_hash"],
        "base_graph_hash": graph["manifest"]["manifest_hash"],
        "paper_count": len(papers),
        "batch_size": batch_size,
        "batches": batches,
        "topic_lifecycle_counts": dict(sorted(lifecycle_counts.items())),
    }


def find_forbidden_membership(value: Any, path: str = "$") -> list[str]:
    found: list[str] = []
    if isinstance(value, dict):
        for key, child in value.items():
            child_path = f"{path}.{key}"
            if key in MEMBERSHIP_KEYS:
                found.append(child_path)
            if key != "resolver":
                found.extend(find_forbidden_membership(child, child_path))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            found.extend(find_forbidden_membership(child, f"{path}[{index}]"))
    return found


def validate_coverage(library: dict[str, Any], coverage: dict[str, Any]) -> None:
    if clean(coverage.get("library_index_hash")) != clean(library.get("index_hash")):
        raise ValueError("coverage library_index_hash does not match context")
    entries = coverage.get("entries")
    if not isinstance(entries, list):
        raise ValueError("coverage.entries must be an array")
    expected = {paper_ref(row) for row in library["papers"]}
    seen: set[str] = set()
    for entry in entries:
        if not isinstance(entry, dict):
            raise ValueError("coverage entries must be objects")
        ref = paper_ref(entry)
        state = clean(entry.get("state"))
        if not ref or ref in seen:
            raise ValueError("coverage requires one unique entry per paper_ref")
        if state not in STATES:
            raise ValueError(f"invalid coverage state for {ref}: {state}")
        if not isinstance(entry.get("topic_ids"), list):
            raise ValueError(f"coverage topic_ids must be an array for {ref}")
        seen.add(ref)
    if seen != expected:
        raise ValueError(
            f"coverage denominator mismatch; missing={sorted(expected-seen)}, extra={sorted(seen-expected)}"
        )
    if not isinstance(coverage.get("overlaps", []), list):
        raise ValueError("coverage.overlaps must be an array")


def validate_plan(
    context: dict[str, Any], coverage: dict[str, Any], plan: dict[str, Any]
) -> dict[str, Any]:
    library, graph = validate_context(context)
    validate_coverage(library, coverage)
    if plan.get("kind") != "topic_plan" or plan.get("operation") != "reconcile":
        raise ValueError("plan kind/operation must be topic_plan/reconcile")
    if clean(plan.get("base_graph_hash")) != clean(graph["manifest"].get("manifest_hash")):
        raise ValueError("plan base_graph_hash does not match context")
    if clean(plan.get("library_index_hash")) != clean(library.get("index_hash")):
        raise ValueError("plan library_index_hash does not match context")
    forbidden = find_forbidden_membership(plan.get("topic_actions", []))
    if forbidden:
        raise ValueError(f"planned membership fields are forbidden: {forbidden}")

    nodes = graph.get("nodes") if isinstance(graph.get("nodes"), list) else []
    node_types = {
        clean(node.get("topic_id")): clean(node.get("node_type"))
        for node in nodes
        if isinstance(node, dict) and clean(node.get("topic_id"))
    }
    raw_recommended_updates = plan.get("recommended_updates")
    if not isinstance(raw_recommended_updates, list):
        raise ValueError("plan.recommended_updates must be an array")
    recommended_updates = {
        clean(value) for value in raw_recommended_updates if clean(value)
    }
    invalid_recommendations = sorted(
        topic_id
        for topic_id in recommended_updates
        if node_types.get(topic_id) != "materialized"
    )
    if invalid_recommendations:
        raise ValueError(
            "recommended_updates must name materialized topics: "
            f"{invalid_recommendations}"
        )
    actions = plan.get("topic_actions")
    if not isinstance(actions, list):
        raise ValueError("plan.topic_actions must be an array")
    known = set(node_types)
    action_ids: set[str] = set()
    for action in actions:
        if not isinstance(action, dict) or clean(action.get("action")) not in ACTIONS:
            raise ValueError("topic action is invalid")
        topic_id = clean(action.get("topic_id"))
        if not topic_id or topic_id in action_ids:
            raise ValueError("topic actions require unique non-empty topic_id values")
        if node_types.get(topic_id) == "materialized":
            raise ValueError(f"planner cannot mutate materialized topic: {topic_id}")
        if action["action"] in {"create", "update"}:
            if (
                not clean(action.get("definition"))
                or not isinstance(action.get("resolver"), dict)
                or not action["resolver"]
            ):
                raise ValueError(f"create/update requires definition and resolver: {topic_id}")
            if int(action.get("revision") or 0) < 1:
                raise ValueError(f"create/update requires positive revision: {topic_id}")
        known.add(topic_id)
        action_ids.add(topic_id)

    proposals = plan.get("relation_proposals")
    if not isinstance(proposals, list):
        raise ValueError("plan.relation_proposals must be an array")
    tuples: set[tuple[str, str, str]] = set()
    for proposal in proposals:
        if not isinstance(proposal, dict):
            raise ValueError("relation proposals must be objects")
        source = clean(proposal.get("source_topic_id"))
        target = clean(proposal.get("target_topic_id"))
        relation = clean(proposal.get("relation"))
        if source not in known or target not in known or source == target or relation not in RELATIONS:
            raise ValueError(f"invalid relation proposal: {source}/{relation}/{target}")
        key = (
            (source, relation, target)
            if relation == "broader_than"
            else (min(source, target), relation, max(source, target))
        )
        if key in tuples:
            raise ValueError(f"duplicate canonical relation tuple: {key}")
        tuples.add(key)

    normalized = dict(plan)
    normalized["topic_actions"] = sorted(actions, key=lambda row: clean(row.get("topic_id")))
    normalized["relation_proposals"] = sorted(
        proposals,
        key=lambda row: (
            clean(row.get("source_topic_id")),
            clean(row.get("relation")),
            clean(row.get("target_topic_id")),
        ),
    )
    normalized["recommended_updates"] = sorted(recommended_updates)
    return normalized


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate Topic Planner runtime artifacts.")
    subparsers = parser.add_subparsers(dest="command", required=True)
    summary_parser = subparsers.add_parser("summarize")
    summary_parser.add_argument("--context", required=True)
    summary_parser.add_argument("--batch-size", type=int, default=24)
    validate_parser = subparsers.add_parser("validate")
    validate_parser.add_argument("--context", required=True)
    validate_parser.add_argument("--coverage", required=True)
    validate_parser.add_argument("--plan", required=True)
    args = parser.parse_args()
    try:
        context = load_object(args.context)
        if args.command == "summarize":
            if args.batch_size < 1 or args.batch_size > 100:
                raise ValueError("batch-size must be between 1 and 100")
            result = summarize(context, args.batch_size)
        else:
            result = validate_plan(
                context, load_object(args.coverage), load_object(args.plan)
            )
        print(json.dumps(result, ensure_ascii=False, sort_keys=True))
        return 0
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(
            json.dumps(
                {
                    "error": {
                        "code": "topic_planner_validation_failed",
                        "message": str(error),
                    }
                },
                ensure_ascii=False,
            ),
            file=sys.stderr,
        )
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
