"""Gate-controlled stage progression for create-topic-synthesis.

The gate returns exactly one next_action plus just-in-time instructions. Resolver
validation must precede paper artifact reads. Paper workset persistence must
precede per-paper analysis. Render is blocked until all required section
payloads exist in SQLite.

Contract note: resolver validation is always before paper artifact reads.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from runtime_db import (
    all_required_final_artifacts_registered,
    assert_schema_version,
    audit_runtime_integrity,
    completed_stages,
    connect,
    get_key_value,
    get_meta,
    missing_citation_graph_metric_receipt_refs,
    has_any_state,
    library_index_status,
    missing_paper_artifact_bundle_receipt_refs,
    missing_paper_analysis_receipt_refs,
    paper_refs,
    stage_state,
)

DB = "runtime/topic-synthesis.sqlite"
BATCH_SIZE = 25
RULE_SUMMARY = (
    "Hard rules: execute only this gate's next_action/command_example; do not hand-write SQLite; "
    "do not use temporary scripts to generate semantic content; do not copy or author hashes; "
    "if an action fails, repair the current stage only and rerun gate; final stdout must be a legal business JSON object."
)
STAGE_ORDER = (
    "stage_0_runtime_setup",
    "stage_1_topic_context",
    "stage_2_resolver_and_workset",
    "stage_3_graph_metrics",
    "stage_4_evidence_collection",
    "stage_5_paper_units",
    "stage_6_cross_paper_map",
    "stage_7_route_timeline",
    "stage_8_core_sections",
    "stage_9_kg_proposals",
    "stage_10_external_statistics_report",
    "stage_11_render_and_validate",
    "stage_12_completed",
)

STAGE_ALIASES: dict[str, str] = {}

ACTION_ALIASES: dict[str, str] = {}

INSTRUCTION_REFS_BY_STAGE = {
    "stage_0_runtime_setup": ["SKILL.md#最小执行主路径 / 0. confirm_runtime_setup"],
    "stage_1_topic_context": ["SKILL.md#最小执行主路径 / 1. persist_topic_context"],
    "stage_2_resolver_and_workset": [
        "SKILL.md#最小执行主路径 / 2. persist_library_index_page / persist_resolver"
    ],
    "stage_3_graph_metrics": ["SKILL.md#最小执行主路径 / 3. persist_citation_graph_metrics"],
    "stage_4_evidence_collection": [
        "SKILL.md#最小执行主路径 / 4. persist_filtered_artifact_manifest"
    ],
    "stage_5_paper_units": ["references/step_05_paper_units.md"],
    "stage_6_cross_paper_map": ["references/step_06_cross_paper_map.md"],
    "stage_7_route_timeline": ["references/step_07_taxonomy_timeline.md"],
    "stage_8_core_sections": ["references/step_08_core_sections.md"],
    "stage_9_kg_proposals": ["references/step_09_kg_proposals.md"],
    "stage_10_external_statistics_report": ["references/step_10_external_statistics_report.md"],
    "stage_11_render_and_validate": ["references/step_11_render_validate.md"],
}

SCHEMA_REFS_BY_ACTION = {
    "persist_topic_context": ["assets/schemas/topic_context_payload.schema.json"],
    "persist_resolver": ["assets/schemas/resolver_manifest.schema.json"],
    "persist_citation_graph_metrics": ["assets/schemas/citation_graph_metrics_receipt.schema.json"],
    "persist_filtered_artifact_manifest": ["assets/schemas/filtered_artifact_manifest.schema.json"],
    "persist_paper_units": ["assets/schemas/paper_analysis_row.schema.json"],
    "persist_cross_paper_evidence_map": ["assets/schemas/cross_paper_evidence_map.schema.json"],
    "persist_route_timeline": ["assets/schemas/route_timeline_synthesis.schema.json"],
    "persist_core_sections": ["assets/schemas/core_analytical_sections.schema.json"],
    "persist_kg_proposals": ["assets/schemas/kg_proposals.schema.json"],
    "persist_external_statistics_report": ["assets/schemas/topic_synthesis_artifact.schema.json"],
    "validate_final_artifacts": [
        "assets/schemas/topic_synthesis_artifact.schema.json",
        "assets/schemas/topic_interest_metadata.schema.json",
    ],
}

SEMANTIC_HINTS_BY_STAGE = {
    "stage_1_topic_context": {
        "semantic_goal": "Define the topic as a usable knowledge window: concept, scope, aliases, field position, and duplicate risk.",
        "quality_focus": "Make the topic boundary specific enough to guide resolver design and later synthesis.",
        "common_pitfalls": "Avoid treating the seed as a keyword string; explain what belongs inside and outside the topic.",
    },
    "stage_2_resolver_and_workset": {
        "semantic_goal": "Convert topic intent into a reproducible paper workset that can support a dense synthesis.",
        "quality_focus": "Resolver choices should match the topic boundary and preserve diagnostic reasons for included/excluded papers.",
        "common_pitfalls": "Do not optimize for maximum paper count; unresolved or borderline papers should be diagnosed, not silently absorbed.",
    },
    "stage_3_graph_metrics": {
        "semantic_goal": "Collect graph-derived role hints for ordering, coverage diagnosis, and external-heavy signals.",
        "quality_focus": "Use metrics as auxiliary context for importance and topology, never as direct evidence for claims.",
        "common_pitfalls": "Do not promote a paper to a milestone only because PageRank or in-degree is high.",
    },
    "stage_4_evidence_collection": {
        "semantic_goal": "Export bounded digest/reference/citation artifacts so later semantic work is grounded in host-verified evidence.",
        "quality_focus": "Missing artifacts are evidence availability facts; record them and adjust confidence later.",
        "common_pitfalls": "Do not infer missing/available artifact status from memory or tool text; use the host-written manifest.",
    },
    "stage_5_paper_units": {
        "semantic_goal": "Extract composable single-paper facts for routes, timeline, claims, comparison, debates, gaps, and external analysis.",
        "quality_focus": "Stay paper-local: problem, method contribution, evaluation context, findings, limitations, and reusable candidates.",
        "common_pitfalls": "Do not write cross-paper conclusions here; do not make claim/timeline candidates from papers without digest evidence.",
    },
    "stage_6_cross_paper_map": {
        "semantic_goal": "Aggregate paper units into a candidate evidence network for taxonomy, timeline, claims, debates, gaps, and review outline.",
        "quality_focus": "Group by shared problem, mechanism, evidence convergence, and tension; preserve candidate ids and paper-unit provenance.",
        "common_pitfalls": "Do not copy paper-unit rows into lists; synthesize reusable candidates without writing final section prose.",
    },
    "stage_7_route_timeline": {
        "semantic_goal": "Explain the topic through research routes and historical progression.",
        "quality_focus": "Taxonomy must analyze route boundaries, mechanisms, trade-offs, maturity, and relations; timeline must explain milestones and progression logic.",
        "common_pitfalls": "Avoid a label-only taxonomy or a year-sorted bibliography; every node/event needs analytical role and evidence.",
    },
    "stage_8_core_sections": {
        "semantic_goal": "Turn route and timeline analysis into core synthesis findings, comparisons, debates, gaps, and writing outline.",
        "quality_focus": "Claims are topic-level findings; comparison dimensions are explanatory; debates need positions and evaluation axes; gaps must separate research gaps from library coverage gaps.",
        "common_pitfalls": "Do not restate paper abstracts as claims; do not present weak local coverage as a field-wide research gap.",
    },
    "stage_9_kg_proposals": {
        "semantic_goal": "Draft KG proposal sidecars from validated topic synthesis context without writing canonical KG assets.",
        "quality_focus": "Concept cards and relation proposals should be grounded in core sections; empty arrays are valid only with diagnostics.",
        "common_pitfalls": "Do not skip the sidecars; do not write canonical concept ids, graph edge ids, SQLite rows, or Git metadata.",
    },
    "stage_10_external_statistics_report": {
        "semantic_goal": "Finalize external literature, coverage/statistics interpretation, and a continuous synthesis report.",
        "quality_focus": "External analysis must identify related outside concepts/methods, coverage verdict, and collection suggestions; report must connect topic definition, routes, history, findings, debates, gaps, and external literature.",
        "common_pitfalls": "Do not write a brief summary; the report should be a dense reader-facing knowledge synthesis grounded in prior sections.",
    },
    "stage_11_render_and_validate": {
        "semantic_goal": "Validate that semantic sections form a coherent, evidence-closed topic synthesis artifact.",
        "quality_focus": "Final validation checks schema, evidence closure, report depth, and provenance; repair the relevant section if validation rejects it.",
        "common_pitfalls": "Do not bypass validation by editing final files; fix the authored section payload and rerun the gate-directed action.",
    },
}

ENUM_CONTRACTS_BY_STAGE = {
    "stage_0_runtime_setup": {
        "operation": ["create"],
        "stage_state": [
            "pending",
            "running",
            "completed",
            "failed_retryable",
            "failed_terminal",
            "canceled",
        ],
    },
    "stage_1_topic_context": {"operation": ["create"]},
    "stage_4_evidence_collection": {
        "artifact_type": ["digest", "references", "citation_analysis"],
        "payload_type": {
            "digest": "digest-markdown",
            "references": "references-json",
            "citation_analysis": "citation-analysis-json",
        },
        "artifact_status": ["available", "missing", "decode_error", "unsupported"],
    },
    "stage_5_paper_units": {
        "topic_relevance.level": ["core", "related", "peripheral", "excluded"],
    },
    "stage_6_cross_paper_map": {
        "gap_candidates[].gap_type": [
            "library_coverage_gap",
            "evidence_gap",
            "method_gap",
            "evaluation_gap",
            "review_gap",
        ],
    },
    "stage_8_core_sections": {
        "gaps[].gap_type": [
            "research_gap",
            "library_coverage_gap",
            "evidence_gap",
            "evaluation_gap",
        ],
        "gaps[].severity": ["low", "medium", "high", "critical", "unknown"],
    },
    "stage_9_kg_proposals": {
        "concept_cards_proposal.cards[].concept_type": [
            "method_family",
            "mechanism",
            "task",
            "benchmark",
            "dataset",
            "evaluation_axis",
            "training_signal",
            "theoretical_construct",
        ],
        "topic_graph_relation_proposals.proposals[].proposal_type": [
            "broader_topic_candidate",
            "related_topic_candidate",
            "overlap_topic_candidate",
            "contrast_topic_candidate",
        ],
    },
    "stage_10_external_statistics_report": {
        "topic.topic_granularity": [
            "method_family",
            "task",
            "problem",
            "application_scenario",
            "theory_concept",
            "mechanism",
            "dataset_or_benchmark",
            "mixed",
        ],
        "coverage_verdict": [
            "sufficient",
            "partial",
            "insufficient",
            "severely_missing",
            "unknown",
        ],
        "representative_references[].information_completeness": [
            "complete",
            "partial",
            "minimal",
            "unknown",
        ],
        "suggested_additions[].priority": ["high", "medium", "low", "unknown"],
    },
    "stage_11_render_and_validate": {
        "final.kind": ["topic_synthesis", "topic_synthesis_canceled"],
        "final.operation": ["create"],
        "canceled.status": ["canceled"],
    },
}


def public_stage(stage: str) -> str:
    return STAGE_ALIASES.get(stage, stage)


def public_action(action: str) -> str:
    return ACTION_ALIASES.get(action, action)


def public_command(command: str) -> str:
    return command


def action_payload(
    *,
    status: str,
    stage: str,
    next_action: str,
    execution_note: str,
    command: str,
    required_reads: list[str],
    required_writes: list[str],
    progress: dict | None = None,
    blocker: str | None = None,
) -> dict:
    stage = public_stage(stage)
    next_action = public_action(next_action)
    value = {
        "status": status,
        "stage": stage,
        "next_action": next_action,
        "core_instruction": RULE_SUMMARY,
        "execution_note": execution_note,
        "command_example": public_command(command),
        "required_reads": required_reads,
        "required_writes": required_writes,
        "instruction_refs": INSTRUCTION_REFS_BY_STAGE.get(stage, []),
        "schema_refs": SCHEMA_REFS_BY_ACTION.get(next_action, []),
        "progress": progress or {},
    }
    enum_contracts = ENUM_CONTRACTS_BY_STAGE.get(stage)
    if enum_contracts:
        value["enum_contracts"] = enum_contracts
    value.update(SEMANTIC_HINTS_BY_STAGE.get(stage, {}))
    if blocker:
        value["blocker"] = blocker
    return value


def next_action(conn) -> dict:
    """Return the single gate-approved next_action for the current run."""

    assert_schema_version(conn)
    operation = str(get_meta(conn, "operation", "create") or "create")
    language = str(get_meta(conn, "language", "zh-CN") or "zh-CN")

    if has_any_state(conn, ("canceled",)):
        return action_payload(
            status="canceled",
            stage="stage_12_completed",
            next_action="emit_topic_synthesis_canceled",
            execution_note="Run is canceled. Do not render sections.",
            command=f'python scripts/stage_runtime.py --db "{DB}" --action cancel',
            required_reads=[],
            required_writes=["final canceled JSON"],
        )
    if has_any_state(conn, ("failed_terminal",)):
        return action_payload(
            status="failed_terminal",
            stage="stage_12_completed",
            next_action="stop",
            execution_note="A terminal failure is recorded. Stop or emit a schema-compatible canceled result.",
            command="",
            required_reads=["runtime/topic-synthesis.sqlite"],
            required_writes=[],
        )
    if has_any_state(conn, ("failed_retryable",)):
        return action_payload(
            status="failed_retryable",
            stage="current_failed_retryable_stage",
            next_action="audit_runtime_integrity",
            execution_note=(
                "A retryable stage failure is recorded. Inspect the failed stage/error first, "
                "then rerun the corresponding stage_runtime command with a corrected payload."
            ),
            command=f'python scripts/stage_runtime.py --db "{DB}" --run-root "." --action audit_runtime_integrity',
            required_reads=["stage error in SQLite"],
            required_writes=["repair command decision for the failed current stage"],
        )

    integrity_errors = audit_runtime_integrity(conn)
    if integrity_errors:
        return action_payload(
            status="blocked",
            stage="stage_0_runtime_setup",
            next_action="audit_runtime_integrity",
            execution_note=(
                "Runtime integrity audit failed. Inspect the structural violation and repair the current stage "
                "through package-local stage_runtime actions; do not patch SQLite manually."
            ),
            command=f'python scripts/stage_runtime.py --db "{DB}" --run-root "." --action audit_runtime_integrity',
            required_reads=["runtime/topic-synthesis.sqlite", "artifact_registry", "action_receipts"],
            required_writes=[],
            progress={"integrity_errors": integrity_errors},
            blocker="runtime_integrity_failed",
        )

    completed = completed_stages(conn)
    if "stage_0_runtime_setup" not in completed:
        return action_payload(
            status="ready",
            stage="stage_0_runtime_setup",
            next_action="confirm_runtime_setup",
            execution_note="Initialize run-local SQLite metadata and lock operation/language before semantic work.",
            command=(
                f'python scripts/stage_runtime.py --db "{DB}" --run-root "." '
                f'--operation "{operation}" --language "{language}" --action confirm_runtime_setup'
            ),
            required_reads=["current working directory", "input topicSeed/language"],
            required_writes=["runtime/topic-synthesis.sqlite runtime metadata"],
            progress={"completed_stages": sorted(completed)},
        )
    if "stage_1_topic_context" not in completed:
        return action_payload(
            status="ready",
            stage="stage_1_topic_context",
            next_action="persist_topic_context",
            execution_note=(
                "Do duplicate check with `./.zotero-bridge/bin/zotero-bridge synthesis list-topics --input '{}'`, define topic intent, "
                "then persist it with the payload-file command. Do not hand-edit SQLite."
            ),
            command=(
                f'python scripts/stage_runtime.py --db "{DB}" --action persist_topic_context '
                '--payload-file "runtime/payloads/topic-context.json"'
            ),
            required_reads=["topicSeed", "language", "zotero-bridge synthesis list-topics"],
            required_writes=["runtime/payloads/topic-context.json", "topic_intent rows"],
            progress={"completed_stages": sorted(completed)},
        )

    topic_definition = get_key_value(conn, "topic_intent", "topic_definition", {})
    if not isinstance(topic_definition, dict) or not str(topic_definition.get("id") or "").strip():
        return action_payload(
            status="blocked",
            stage="stage_1_topic_context",
            next_action="repair_topic_definition",
            execution_note=(
                "Stage 1 is incomplete: runtime requires topic_definition.id and topic_definition.title. "
                "Map any legacy intent payload to topic_definition and rerun persist_topic_context."
            ),
            command=(
                f'python scripts/stage_runtime.py --db "{DB}" --action persist_topic_context '
                '--payload-file "runtime/payloads/topic-context.json"'
            ),
            required_reads=["runtime/payloads/topic-context.json", "topic_intent rows"],
            required_writes=["topic_definition.id", "topic_definition.title"],
            blocker="topic_definition_missing_id",
        )

    if "stage_2_resolver_and_workset" not in completed:
        index_status = library_index_status(conn)
        if not index_status.get("complete"):
            cursor = str(index_status.get("next_cursor") or "0")
            safe_cursor = cursor.replace(":", "_").replace("/", "_").replace("\\", "_") or "0"
            args_hint = '{"limit":100}' if cursor == "0" else '{"cursor":"' + cursor + '","limit":100}'
            return action_payload(
                status="ready",
                stage="stage_2_resolver_and_workset",
                next_action="persist_library_index_page",
                execution_note=(
                    "Read the next compact complete-library-index page with `./.zotero-bridge/bin/zotero-bridge synthesis get-library-index --input ...`, "
                    "then persist the full page receipt. The payload file must contain the page's papers[] array, "
                    "cursor/next_cursor, has_more, and index_hash; cursor/hash metadata alone is invalid. "
                    "The limit is only page size; continue until has_more=false. Request includeTags/includeCollections "
                    "only when resolver design needs global tag or collection statistics; do not routinely request includeItems."
                ),
                command=(
                    f'python scripts/stage_runtime.py --db "{DB}" --action persist_library_index_page '
                    f'--payload-file "runtime/payloads/library-index-page-{safe_cursor}.json"'
                ),
                required_reads=[
                    f"./.zotero-bridge/bin/zotero-bridge synthesis get-library-index --input '{args_hint}'",
                    "previous library_index_pages receipt chain",
                ],
                required_writes=[
                    f"runtime/payloads/library-index-page-{safe_cursor}.json",
                    "library_index_pages receipt",
                ],
                progress=index_status,
            )
        return action_payload(
            status="ready",
            stage="stage_2_resolver_and_workset",
            next_action="persist_resolver",
            execution_note=(
                "Build a reproducible resolver from the completed library index receipt, "
                "run `./.zotero-bridge/bin/zotero-bridge synthesis resolve-resolver --input ...`, then persist resolver diagnostics and resolved_paper_set."
            ),
            command=(
                f'python scripts/stage_runtime.py --db "{DB}" --action persist_resolver '
                '--payload-file "runtime/payloads/resolver.json"'
            ),
            required_reads=["topic_intent", "complete library_index_pages receipt", "zotero-bridge synthesis resolve-resolver"],
            required_writes=["runtime/payloads/resolver.json", "topic_resolver rows"],
            progress={"completed_stages": sorted(completed)},
        )

    missing_bundles = missing_paper_artifact_bundle_receipt_refs(conn)
    missing_metrics = missing_citation_graph_metric_receipt_refs(conn)
    missing = missing_paper_analysis_receipt_refs(conn)
    if (
        "stage_3_graph_metrics" not in completed
        or "stage_4_evidence_collection" not in completed
        or "stage_5_paper_units" not in completed
    ):
        if "stage_2_resolver_and_workset" not in completed:
            return action_payload(
                status="blocked",
                stage="stage_2_resolver_and_workset",
                next_action="persist_resolver",
                execution_note="paper_workset is derived by persist_resolver; rerun resolver persistence if it is missing.",
                command=f'python scripts/stage_runtime.py --db "{DB}" --action persist_resolver --payload-file "runtime/payloads/resolver.json"',
                required_reads=["paper_workset"],
                required_writes=["runtime/payloads/resolver.json", "paper_workset rows"],
                blocker="paper_workset_not_completed",
            )
        if missing_metrics:
            batch_refs = missing_metrics[:BATCH_SIZE]
            refs_json = json.dumps(batch_refs, ensure_ascii=False)
            return action_payload(
                status="ready",
                stage="stage_3_graph_metrics",
                next_action="persist_citation_graph_metrics",
                execution_note=(
                    f"Call `./.zotero-bridge/bin/zotero-bridge synthesis get-citation-graph-metrics --input ...` for the current paper_workset batch paperRefs={refs_json}; "
                    "persist the returned bounded metrics summary before artifact export. Metrics are auxiliary graph-derived signals only: "
                    "they can guide paper ordering, role hints, coverage/gaps, and external-heavy diagnostics, but never replace digest evidence."
                ),
                command=(
                    f'python scripts/stage_runtime.py --db "{DB}" --action persist_citation_graph_metrics '
                    '--payload-file "runtime/payloads/citation-graph-metrics-batch.json"'
                ),
                required_reads=[
                    "paper_workset batch",
                    './.zotero-bridge/bin/zotero-bridge synthesis get-citation-graph-metrics --input \'{"paperRefs":' + refs_json + ',"sortBy":"foundation","limit":' + str(len(batch_refs)) + "}\'",
                ],
                required_writes=[
                    "runtime/payloads/citation-graph-metrics-batch.json",
                    "citation_graph_metrics rows",
                    "citation graph metrics action receipt",
                ],
                progress={
                    "paper_refs": batch_refs,
                    "batch_size": len(batch_refs),
                    "paper_count": len(paper_refs(conn)),
                    "metrics_receipt_count": len(paper_refs(conn)) - len(missing_metrics),
                    "missing_metric_refs": missing_metrics,
                },
            )
        if missing_bundles:
            batch_refs = missing_bundles[:BATCH_SIZE]
            refs_json = json.dumps(batch_refs, ensure_ascii=False)
            return action_payload(
                status="ready",
                stage="stage_4_evidence_collection",
                next_action="persist_filtered_artifact_manifest",
                execution_note=(
                    f"Call `./.zotero-bridge/bin/zotero-bridge synthesis export-filtered-paper-artifacts --input ...` with run_root set to the absolute current ACP run workspace and paper_refs={refs_json}; "
                    "the host writes runtime/payloads/paper-artifacts-manifest.json plus filtered content files. "
                    "Then persist the manifest below. Do not hand-write artifact files or hashes."
                ),
                command=(
                    f'python scripts/stage_runtime.py --db "{DB}" --run-root "." --action persist_filtered_artifact_manifest '
                    f'--payload-file "runtime/payloads/paper-artifacts-manifest.json"'
                ),
                required_reads=[
                    "paper_workset batch",
                    './.zotero-bridge/bin/zotero-bridge synthesis export-filtered-paper-artifacts --input \'{"run_root":"<absolute current run workspace>","paper_refs":' + refs_json + "}\'",
                ],
                required_writes=[
                    "runtime/payloads/paper-artifacts-manifest.json",
                    "runtime/payloads/artifacts/<safe-ref>/*",
                    "filtered artifact manifest receipt",
                ],
                progress={
                    "paper_refs": batch_refs,
                    "batch_size": len(batch_refs),
                    "paper_count": len(paper_refs(conn)),
                    "bundle_receipt_count": len(paper_refs(conn)) - len(missing_bundles),
                    "missing_bundle_refs": missing_bundles,
                },
            )
        if missing:
            batch_refs = missing[:BATCH_SIZE]
            return action_payload(
                status="ready",
                stage="stage_5_paper_units",
                next_action="persist_paper_units",
                execution_note=(
                    f"Use the persisted host artifact bundle receipts for paper_refs={json.dumps(batch_refs, ensure_ascii=False)}; "
                    "read the filtered artifact content files, then write one LLM-authored enhanced paper-unit analysis row per paper into an analysis manifest. "
                    "Stage 4 is the only paper-level extraction step: include bibliographic, topic_relevance, research_problem, method_contribution, "
                    "evaluation_context, findings, limitations, taxonomy_hints, timeline_candidates, claim_support_candidates, comparison_facts, "
                    "external_references, citation_contexts, and missing_payloads. "
                    "Do not include payload_hash, digest_ref, or digest_locator; runtime injects digest locators without sending hashes through LLM tokens. "
                    "Do not create scripts that generate semantic analysis. "
                    "comparison_facts must stay paper-local and must not compare against other paper_refs. "
                    "persist_paper_units will reject claim/timeline candidates if digest is missing, "
                    "and external/citation rows if their source artifacts are missing."
                ),
                command=(
                    f'python scripts/stage_runtime.py --db "{DB}" --run-root "." --action persist_paper_units '
                    f'--payload-file "runtime/payloads/paper-units-batch.json"'
                ),
                required_reads=[
                    "paper_workset batch",
                    "paper_artifact_bundle receipts",
                ],
                required_writes=[
                    "runtime/payloads/paper-units-batch.json",
                    "runtime/views/cross-paper-evidence-index.json",
                    "paper_analysis rows",
                ],
                progress={
                    "paper_refs": batch_refs,
                    "batch_size": len(batch_refs),
                    "paper_count": len(paper_refs(conn)),
                    "bundle_receipt_count": len(paper_refs(conn)),
                    "analyzed_count": len(paper_refs(conn)) - len(missing),
                    "missing_paper_refs": missing,
                },
            )
        return action_payload(
            status="ready",
            stage="stage_5_paper_units",
            next_action="persist_paper_units",
            execution_note=(
                "paper_analysis rows exist but the canonical stage receipt/state is incomplete. "
                "Rerun the batch paper-units persist action with the existing manifest to register the canonical receipt."
            ),
            command=(
                f'python scripts/stage_runtime.py --db "{DB}" --run-root "." --action persist_paper_units '
                '--payload-file "runtime/payloads/paper-units-batch.json"'
            ),
            required_reads=["paper_analysis rows"],
            required_writes=["canonical persist_paper_units receipt", "stage_5_paper_units completed"],
            progress={"paper_count": len(paper_refs(conn)), "analyzed_count": len(paper_refs(conn))},
        )

    if (
        "stage_6_cross_paper_map" not in completed
        or "stage_7_route_timeline" not in completed
        or "stage_8_core_sections" not in completed
        or "stage_9_kg_proposals" not in completed
        or "stage_10_external_statistics_report" not in completed
    ):
        if missing_bundles:
            return action_payload(
                status="blocked",
                stage="stage_4_evidence_collection",
                next_action="persist_filtered_artifact_manifest",
                execution_note=(
                    "Every paper needs a host artifact bundle row and its matching "
                    "persist_filtered_artifact_manifest action receipt before cross-paper synthesis."
                ),
                command=(
                    f'python scripts/stage_runtime.py --db "{DB}" --run-root "." --action persist_filtered_artifact_manifest '
                    '--payload-file "runtime/payloads/paper-artifacts-manifest.json"'
                ),
                required_reads=["paper_artifact_bundles"],
                required_writes=["filtered artifact manifest receipt"],
                progress={"missing_bundle_refs": missing_bundles},
                blocker="artifact_bundle_action_receipts_incomplete",
            )
        if missing:
            return action_payload(
                status="blocked",
                stage="stage_5_paper_units",
                next_action="persist_paper_units",
                execution_note=(
                    "Every paper_workset row needs one paper_analysis row and its matching "
                    "persist_paper_units action receipt before cross-paper synthesis."
                ),
                command=(
                    f'python scripts/stage_runtime.py --db "{DB}" --run-root "." --action persist_paper_units '
                    '--payload-file "runtime/payloads/paper-units-batch.json"'
                ),
                required_reads=["paper_analysis rows"],
                required_writes=["runtime/payloads/paper-units-batch.json", "paper_analysis rows"],
                progress={"missing_paper_refs": missing},
                blocker="paper_analysis_action_receipts_incomplete",
            )
        source_context_hash = str(get_meta(conn, "source_context_hash", "") or "")
        if not source_context_hash:
            return action_payload(
                status="ready",
                stage="stage_6_cross_paper_map",
                next_action="export_cross_paper_context",
                execution_note=(
                    "Export deterministic cross-paper context from SQLite before synthesis. "
                    "Read runtime/views/cross-paper-context.md for primary synthesis and "
                    "runtime/views/external-literature-context.md for external literature analysis. "
                    "Read only the markdown views as LLM context."
                ),
                command=(
                    f'python scripts/stage_runtime.py --db "{DB}" --run-root "." '
                    '--action export_cross_paper_context'
                ),
                required_reads=["paper_workset rows", "paper_artifact_bundles rows", "paper_analysis rows"],
                required_writes=[
                    "runtime/views/cross-paper-context.md",
                    "runtime/views/external-literature-context.md",
                    "runtime/views/cross-paper-context.manifest.json",
                    "artifact_registry context hashes",
                ],
                progress={"paper_count": len(paper_refs(conn)), "analyzed_count": len(paper_refs(conn))},
            )
        # Public v2 sequence: export_cross_paper_context -> persist_cross_paper_evidence_map.
        evidence_map_hash = str(get_meta(conn, "cross_paper_evidence_map_hash", "") or "")
        if not evidence_map_hash:
            return action_payload(
                status="ready",
                stage="stage_6_cross_paper_map",
                next_action="persist_cross_paper_evidence_map",
                execution_note=(
                    "LLM-authored cross-paper evidence map is required before final sections. "
                    "Read runtime/views/cross-paper-context.md, runtime/views/external-literature-context.md, "
                    "runtime/views/cross-paper-context.manifest.json, and runtime/views/cross-paper-evidence-index.json. "
                    "Do not redo paper-level extraction; aggregate validated paper units into taxonomy_candidates, "
                    "comparison_dimensions, claim_candidates, debate_candidates, gap_candidates, and review_outline_seeds. "
                    "Use unknown for missing facts, keep external literature as background only, and do not infer field-wide gaps from local coverage gaps."
                ),
                command=(
                    f'python scripts/stage_runtime.py --db "{DB}" --run-root "." '
                    '--action persist_cross_paper_evidence_map --payload-file "runtime/payloads/cross-paper-evidence-map.json"'
                ),
                required_reads=[
                    "runtime/views/cross-paper-context.md",
                    "runtime/views/external-literature-context.md",
                    "runtime/views/cross-paper-context.manifest.json",
                    "runtime/views/cross-paper-evidence-index.json",
                ],
                required_writes=[
                    "runtime/payloads/cross-paper-evidence-map.json",
                    "validated cross-paper evidence map receipt",
                ],
                progress={"completed_stages": sorted(completed)},
            )
        route_timeline_hash = str(get_meta(conn, "route_timeline_synthesis_hash", "") or "")
        if not route_timeline_hash:
            return action_payload(
                status="ready",
                stage="stage_7_route_timeline",
                next_action="persist_route_timeline",
                execution_note=(
                    "Draft route/timeline synthesis before final section writing. "
                    "Read step_07_taxonomy_timeline.md and section_examples.md. "
                    "Payload must contain taxonomy.summary, taxonomy.nodes, timeline_events.summary, and timeline_events.events. "
                    "timeline_events must be an object, not an array."
                ),
                command=(
                    f'python scripts/stage_runtime.py --db "{DB}" --run-root "." '
                    '--action persist_route_timeline --payload-file "runtime/payloads/route-timeline-synthesis.json"'
                ),
                required_reads=[
                    "references/step_07_taxonomy_timeline.md",
                    "references/section_examples.md",
                    "runtime/views/cross-paper-context.md",
                    "runtime/views/cross-paper-evidence-index.json",
                    "runtime/payloads/cross-paper-evidence-map.json",
                ],
                required_writes=[
                    "runtime/payloads/route-timeline-synthesis.json",
                    "validated route/timeline synthesis receipt",
                ],
                progress={"completed_stages": sorted(completed)},
            )
        core_sections_hash = str(get_meta(conn, "core_analytical_sections_hash", "") or "")
        if not core_sections_hash:
            return action_payload(
                status="ready",
                stage="stage_8_core_sections",
                next_action="persist_core_sections",
                execution_note=(
                    "Draft claims, comparison, debates, gaps, review_outline, and positioning as a separate payload. "
                    "Read step_08_core_sections.md and the validated route/timeline synthesis. "
                    "Do not rewrite taxonomy/timeline here."
                ),
                command=(
                    f'python scripts/stage_runtime.py --db "{DB}" --run-root "." '
                    '--action persist_core_sections --payload-file "runtime/payloads/core-analytical-sections.json"'
                ),
                required_reads=[
                    "references/step_08_core_sections.md",
                    "runtime/payloads/route-timeline-synthesis.json",
                    "runtime/views/cross-paper-context.md",
                    "runtime/views/external-literature-context.md",
                    "runtime/payloads/cross-paper-evidence-map.json",
                ],
                required_writes=[
                    "runtime/payloads/core-analytical-sections.json",
                    "validated core analytical sections receipt",
                ],
                progress={"completed_stages": sorted(completed)},
            )
        kg_concept_path = str(get_meta(conn, "concept_cards_proposal_path", "") or "")
        kg_relation_path = str(get_meta(conn, "topic_graph_relation_proposals_path", "") or "")
        if not kg_concept_path or not kg_relation_path:
            return action_payload(
                status="ready",
                stage="stage_9_kg_proposals",
                next_action="persist_kg_proposals",
                execution_note=(
                    "Draft the required-form KG proposal payload after core sections. "
                    "Read step_09_kg_proposals.md, validated route/timeline and core sections, both context markdown files, and the evidence map. "
                    "The payload must contain concept_cards_proposal.cards[] and topic_graph_relation_proposals.proposals[]. "
                    "If no reliable proposals exist, write empty arrays with diagnostics; do not skip the sidecars and do not write canonical KG assets."
                ),
                command=(
                    f'python scripts/stage_runtime.py --db "{DB}" --run-root "." '
                    '--action persist_kg_proposals --payload-file "runtime/payloads/kg-proposals.json"'
                ),
                required_reads=[
                    "references/step_09_kg_proposals.md",
                    "runtime/payloads/route-timeline-synthesis.json",
                    "runtime/payloads/core-analytical-sections.json",
                    "runtime/views/cross-paper-context.md",
                    "runtime/views/external-literature-context.md",
                    "runtime/payloads/cross-paper-evidence-map.json",
                ],
                required_writes=[
                    "runtime/payloads/kg-proposals.json",
                    "result/sidecars/concept-cards-proposal.json",
                    "result/sidecars/topic-graph-relation-proposals.json",
                    "validated KG proposal receipt",
                ],
                progress={"completed_stages": sorted(completed)},
            )
        return action_payload(
            status="ready",
            stage="stage_10_external_statistics_report",
            next_action="persist_external_statistics_report",
            execution_note=(
                "Write the Stage 10 payload first; runtime will prevalidate and materialize result/sections/*.json only after the payload passes. "
                "Read step_10_external_statistics_report.md, route-timeline synthesis, core analytical sections, both context markdown files, and the validated evidence map. "
                "The payload must contain sections for topic, summary, paper_evidence, external_literature_analysis, coverage, statistics, synthesis_report, evidence_map, source_artifacts, and diagnostics. "
                "Do not include taxonomy, timeline_events, positioning, claims, comparison_matrix, debates, gaps, or review_outline in this payload; runtime preserves those from validated Stage 7/8 artifacts. "
                "synthesis_report.source_section_chapters must bind research_routes to taxonomy.summary and historical_progression to timeline_events.summary. "
                "synthesis_report is a continuous report, not a short summary: it must include a non-empty title and cover topic definition/scope, research routes, historical progression, core findings, comparison/debates, gaps/coverage, and external literature/collection suggestions."
            ),
            command=(
                f'python scripts/stage_runtime.py --db "{DB}" --run-root "." --operation "{operation}" '
                f'--language "{language}" --action persist_external_statistics_report '
                '--payload-file "runtime/payloads/external-statistics-report.json"'
            ),
            required_reads=[
                "references/step_10_external_statistics_report.md",
                "references/section_examples.md",
                "runtime/payloads/route-timeline-synthesis.json",
                "runtime/payloads/core-analytical-sections.json",
                "runtime/views/cross-paper-context.md",
                "runtime/views/external-literature-context.md",
                "runtime/views/cross-paper-evidence-index.json",
                "runtime/payloads/cross-paper-evidence-map.json",
                "topic_intent",
                "topic_resolver",
            ],
            required_writes=[
                "runtime/payloads/external-statistics-report.json",
                "prevalidated Stage 10 sections",
                "runtime-materialized result/sections/*.json",
            ],
            progress={"completed_stages": sorted(completed)},
        )

    if missing_bundles or missing:
        return action_payload(
            status="blocked",
            stage="stage_11_render_and_validate",
            next_action="repair_stage4_action_receipts_before_render",
            execution_note=(
                "Render is blocked because Stage 4 rows are not backed by package-local "
                "stage action receipts. Re-run the gate-directed persist_filtered_artifact_manifest "
                "and persist_paper_units actions; direct SQLite rows are not valid state."
            ),
            command=f'python scripts/stage_runtime.py --db "{DB}" --run-root "." --action audit_runtime_integrity',
            required_reads=["action_receipts", "paper_artifact_bundles", "paper_analysis"],
            required_writes=[],
            progress={
                "missing_bundle_action_receipt_refs": missing_bundles,
                "missing_analysis_action_receipt_refs": missing,
            },
            blocker="stage4_action_receipts_incomplete",
        )

    if "stage_11_render_and_validate" not in completed:
        return action_payload(
            status="ready",
            stage="stage_11_render_and_validate",
            next_action="validate_final_artifacts",
            execution_note=(
                "Validate agent-authored result/sections JSON files, generate the structured manifest/result bundle, "
                "and register artifact_registry. Host apply performs any canonical export after structured persistence."
            ),
            command=(
                f'python scripts/stage_runtime.py --db "{DB}" --run-root "." '
                f'--operation "{operation}" --language "{language}" --action validate_final_artifacts'
            ),
            required_reads=["result/sections/*.json", "paper_analysis rows", "artifact metadata"],
            required_writes=[
                "result/sections/*.json",
                "result/topic-analysis.json",
                "result/sidecars/topic-interest-metadata.json",
                "result/result.json",
            ],
            progress={"completed_stages": sorted(completed)},
        )

    if not all_required_final_artifacts_registered(conn, operation=operation):
        return action_payload(
            status="blocked",
            stage="stage_12_completed",
            next_action="register_validated_section_manifest_and_final_stdout",
            execution_note="Final manifest and stdout are not registered in artifact_registry.",
            command=(
                f'python scripts/stage_runtime.py --db "{DB}" --run-root "." '
                f'--operation "{operation}" --language "{language}" --action validate_final_artifacts'
            ),
            required_reads=["artifact_registry"],
            required_writes=["validated final artifacts"],
            blocker="final_artifacts_unregistered",
        )

    if stage_state(conn, "stage_12_completed") != "completed":
        return action_payload(
            status="ready",
            stage="stage_12_completed",
            next_action="complete",
            execution_note="Artifacts are registered; emit the generated business JSON and stop.",
            command='Get-Content -Encoding UTF8 "result/result.json"',
            required_reads=["result/result.json"],
            required_writes=["assistant final JSON only"],
        )

    return action_payload(
        status="completed",
        stage="stage_12_completed",
        next_action="none",
        execution_note="Run is complete. Do not append explanation after final JSON.",
        command="",
        required_reads=[],
        required_writes=[],
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", default=DB)
    args = parser.parse_args()
    conn = connect(Path(args.db))
    print(json.dumps(next_action(conn), ensure_ascii=False, sort_keys=True))


if __name__ == "__main__":
    main()
