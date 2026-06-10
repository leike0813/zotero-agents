"""Gate-controlled stage progression for update-topic-synthesis.

The gate returns exactly one next_action plus just-in-time instructions. Update
mode selection is recorded in SQLite and exposed on every gate response so the
agent keeps operation, changed sections, and read section hashes visible.

Contract note: resolver validation is always before paper artifact reads, and
paper workset persistence is always before per-paper analysis.
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
    has_any_state,
    missing_citation_graph_metric_receipt_refs,
    missing_paper_artifact_bundle_receipt_refs,
    missing_paper_analysis_receipt_refs,
    paper_refs,
    stage_state,
)

DB = "runtime/topic-synthesis.sqlite"
BATCH_SIZE = 25
RULE_SUMMARY = (
    "Hard rules: execute only this gate's next_action/command_example; do not hand-write SQLite; "
    "do not use temporary scripts to generate semantic content; rely on runtime receipts for provenance metadata; "
    "if an action fails, repair the current stage only and rerun gate; final stdout must be a legal business JSON object."
)
STAGE_ORDER = (
    "stage_0_runtime_setup",
    "stage_1_topic_context",
    "stage_2_resolver_and_workset",
    "stage_5_paper_triage",
    "stage_6_cross_paper_map",
    "stage_8_core_synthesis",
    "stage_9_kg_enrichment",
    "stage_10_summary_coverage",
    "stage_11_render_and_validate",
    "stage_12_completed",
)

STAGE_ALIASES: dict[str, str] = {}

ACTION_ALIASES: dict[str, str] = {}

INSTRUCTION_REFS_BY_STAGE = {
    "stage_0_runtime_setup": ["SKILL.md#最小执行主路径 / 0. confirm_runtime_setup"],
    "stage_1_topic_context": ["SKILL.md#最小执行主路径 / 1. persist_topic_context"],
    "stage_2_resolver_and_workset": ["SKILL.md#最小执行主路径 / 2. persist_resolver"],
    "stage_5_paper_triage": ["references/step_05_paper_triage.md"],
    "stage_6_cross_paper_map": ["references/step_06_cross_paper_map.md"],
    "stage_8_core_synthesis": ["references/step_08_core_synthesis.md"],
    "stage_9_kg_enrichment": ["references/step_09_kg_enrichment.md"],
    "stage_10_summary_coverage": ["references/step_10_summary_coverage.md"],
    "stage_11_render_and_validate": ["references/step_11_render_validate.md"],
}

SCHEMA_REFS_BY_ACTION = {
    "persist_topic_context": ["assets/schemas/topic_context_payload.schema.json"],
    "persist_resolver": ["assets/schemas/resolver_proposal.schema.json"],
    "persist_paper_triage": ["assets/schemas/paper_analysis_row.schema.json"],
    "persist_cross_paper_evidence_map": ["assets/schemas/cross_paper_evidence_map.schema.json"],
    "persist_core_synthesis": ["assets/schemas/core_analytical_sections.schema.json"],
    "persist_kg_enrichment": ["assets/schemas/kg_enrichment.schema.json"],
    "finalize_summary_coverage": ["assets/schemas/topic_synthesis_artifact.schema.json"],
    "validate_final_artifacts": [
        "assets/schemas/topic_synthesis_artifact.schema.json",
        "assets/schemas/topic_interest_metadata.schema.json",
    ],
}

SEMANTIC_HINTS_BY_STAGE = {
    "stage_1_topic_context": {
        "semantic_goal": "Store the host-returned topic context and add only a compact update assessment.",
        "quality_focus": "Preserve the host context as returned while identifying what actually needs refresh.",
        "common_pitfalls": "Keep host facts inside topic_context and put agent judgment only in update_assessment.",
    },
    "stage_2_resolver_and_workset": {
        "semantic_goal": "Author a compact resolver proposal; runtime then resolves papers, collects graph metrics, and exports bounded paper artifacts in one cascade.",
        "quality_focus": "Resolver decisions must match recommended_update, update scope, and topic boundary.",
        "common_pitfalls": "Do not silently change paper set in patch mode; paper set or language/schema changes force full update.",
    },
    "stage_5_paper_triage": {
        "semantic_goal": "Assess each paper's topic relevance, quality, and compact core digest.",
        "quality_focus": "Stay paper-local and concise; write only fields in the triage schema.",
        "common_pitfalls": "Do not write cross-paper conclusions or section candidates in paper triage.",
    },
    "stage_6_cross_paper_map": {
        "semantic_goal": "Export runtime context and evidence-map provenance for refreshed taxonomy, timeline, claims, debates, gaps, and review outline.",
        "quality_focus": "Use validated triage rows and host-verified artifacts as context; preserve runtime candidate ids when they are present.",
        "common_pitfalls": "Do not author cross-paper candidate ids or evidence_map_refs by hand.",
    },
    "stage_8_core_synthesis": {
        "semantic_goal": "Submit taxonomy, timeline, positioning, claims, improvement dimensions, debates, gaps, outline, and concept labels in one core synthesis payload.",
        "quality_focus": "Use source_paper_refs for evidence; improvement dimensions should explain method progress and tradeoffs.",
        "common_pitfalls": "Do not restate paper abstracts as claims; do not present weak local coverage as a field-wide research gap.",
    },
    "stage_9_kg_enrichment": {
        "semantic_goal": "Provide concept details, topic relation candidates, and topic matching terms for runtime sidecar materialization.",
        "quality_focus": "Ground enrichment in validated core synthesis and topic boundary.",
        "common_pitfalls": "Do not write canonical KG assets, SQLite rows, or Git metadata.",
    },
    "stage_10_summary_coverage": {
        "semantic_goal": "Finalize summary, coverage interpretation, reliability caveats, external context summary, and collection suggestions.",
        "quality_focus": "Keep the payload interpretive; runtime materializes statistics, source artifacts, and report.",
        "common_pitfalls": "Do not duplicate core synthesis sections in the final summary coverage payload.",
    },
    "stage_11_render_and_validate": {
        "semantic_goal": "Validate that changed sections merge into a coherent, evidence-closed topic synthesis artifact.",
        "quality_focus": "Final validation checks schema, evidence closure, report depth, base/read hashes, and provenance; repair the relevant section if validation rejects it.",
        "common_pitfalls": "Do not bypass validation by editing final files; fix the authored section payload and rerun the gate-directed action.",
    },
}

ENUM_CONTRACTS_BY_STAGE = {
    "stage_0_runtime_setup": {
        "operation": ["update_full", "update_patch"],
        "stage_state": [
            "pending",
            "running",
            "completed",
            "failed_retryable",
            "failed_terminal",
            "canceled",
        ],
    },
    "stage_1_topic_context": {
        "operation": ["update_full", "update_patch"],
        "get-topic-context.mode": ["update"],
    },
    "stage_5_paper_triage": {
        "topic_relevance.level": ["core", "related", "peripheral", "excluded"],
        "paper_quality.level": ["high", "medium", "low", "unknown"],
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
    "stage_8_core_synthesis": {
        "gaps[].gap_type": [
            "research_gap",
            "library_coverage_gap",
            "evidence_gap",
            "evaluation_gap",
        ],
        "gaps[].severity": ["low", "medium", "high", "critical", "unknown"],
    },
    "stage_9_kg_enrichment": {
        "concept_details[].concept_type": [
            "method_family",
            "mechanism",
            "task",
            "benchmark",
            "dataset",
            "evaluation_axis",
            "training_signal",
            "theoretical_construct",
        ],
        "topic_relation_candidates[].relation_type": [
            "broader_topic_candidate",
            "related_topic_candidate",
            "overlap_topic_candidate",
            "contrast_topic_candidate",
        ],
    },
    "stage_10_summary_coverage": {
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
        "final.operation": ["update_full", "update_patch"],
        "patch.mode": ["section_replace"],
        "patch.unchanged_section_policy": ["inherit_current"],
        "canceled.status": ["canceled"],
    },
}


def public_stage(stage: str) -> str:
    return STAGE_ALIASES.get(stage, stage)


def public_action(action: str) -> str:
    return ACTION_ALIASES.get(action, action)


def public_command(command: str) -> str:
    return command


def update_context(conn) -> dict:
    return {
        "recommended_update": get_meta(conn, "recommended_update", {}),
        "operation": get_meta(conn, "operation", "update_full"),
        "changed_sections": get_meta(conn, "changed_sections", []),
        "read_section_hashes": get_meta(conn, "read_section_hashes", {}),
    }


def action_payload(
    *,
    conn,
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
        **update_context(conn),
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
    operation = str(get_meta(conn, "operation", "update_full") or "update_full")
    language = str(get_meta(conn, "language", "zh-CN") or "zh-CN")

    if has_any_state(conn, ("canceled",)):
        return action_payload(
            conn=conn,
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
            conn=conn,
            status="failed_terminal",
            stage="stage_12_completed",
            next_action="stop",
            execution_note="A terminal failure is recorded. Stop or emit a schema-valid canceled result.",
            command="",
            required_reads=["runtime/topic-synthesis.sqlite"],
            required_writes=[],
        )
    if has_any_state(conn, ("failed_retryable",)):
        return action_payload(
            conn=conn,
            status="failed_retryable",
            stage="current_failed_retryable_stage",
            next_action="audit_runtime_integrity",
            execution_note=(
                "A retryable stage failure is recorded. Inspect the failed stage/error first, "
                "then rerun the corresponding stage_runtime command with a corrected payload."
            ),
            command=f'python scripts/stage_runtime.py --db "{DB}" --action audit_runtime_integrity',
            required_reads=["stage error in SQLite"],
            required_writes=["repair command decision for the failed current stage"],
        )

    integrity_errors = audit_runtime_integrity(conn)
    if integrity_errors:
        return action_payload(
            conn=conn,
            status="blocked",
            stage="stage_0_runtime_setup",
            next_action="audit_runtime_integrity",
            execution_note=(
                "Runtime integrity audit failed. Inspect the structural violation and repair the current stage "
                "through package-local stage_runtime actions; do not patch SQLite manually."
            ),
            command=f'python scripts/stage_runtime.py --db "{DB}" --action audit_runtime_integrity',
            required_reads=["runtime/topic-synthesis.sqlite", "artifact_registry", "action_receipts"],
            required_writes=[],
            progress={"integrity_errors": integrity_errors},
            blocker="runtime_integrity_failed",
        )

    completed = completed_stages(conn)
    if "stage_0_runtime_setup" not in completed:
        return action_payload(
            conn=conn,
            status="ready",
            stage="stage_0_runtime_setup",
            next_action="confirm_runtime_setup",
            execution_note="Initialize run-local SQLite metadata and lock operation/language before semantic work.",
            command=(
                f'python scripts/stage_runtime.py --db "{DB}" '
                f'--operation "{operation}" --language "{language}" --action confirm_runtime_setup'
            ),
            required_reads=["current working directory", "input topicId/update mode/language"],
            required_writes=["runtime/topic-synthesis.sqlite runtime metadata"],
            progress={"completed_stages": sorted(completed), **update_context(conn)},
        )
    if "stage_1_topic_context" not in completed:
        return action_payload(
            conn=conn,
            status="ready",
            stage="stage_1_topic_context",
            next_action="persist_topic_context",
            execution_note=(
                "Run `./.zotero-bridge/bin/zotero-bridge synthesis get-topic-context --input ...` with includeArtifact/includeManifest, "
                "store the returned object as topic_context, and add only optional update_assessment fields."
            ),
            command=(
                f'python scripts/stage_runtime.py --db "{DB}" --action persist_topic_context '
                '--payload-file "runtime/payloads/topic-context.json"'
            ),
            required_reads=["topicId", "updateScope", "updateMode", "zotero-bridge synthesis get-topic-context"],
            required_writes=["runtime/payloads/topic-context.json", "runtime-derived topic_intent rows"],
            progress={"completed_stages": sorted(completed)},
        )

    topic_definition = get_key_value(conn, "topic_intent", "topic_definition", {})
    if not isinstance(topic_definition, dict) or not str(topic_definition.get("id") or "").strip():
        return action_payload(
            conn=conn,
            status="blocked",
            stage="stage_1_topic_context",
            next_action="repair_topic_context",
            execution_note=(
                "Stage 1 is incomplete: the topic_context payload is missing required host topic fields. "
                "Rerun persist_topic_context with the host get-topic-context response under topic_context."
            ),
            command=(
                f'python scripts/stage_runtime.py --db "{DB}" --action persist_topic_context '
                '--payload-file "runtime/payloads/topic-context.json"'
            ),
            required_reads=["runtime/payloads/topic-context.json", "topic_intent rows"],
            required_writes=["valid topic_context payload", "persisted topic intent"],
            progress={"completed_stages": sorted(completed), **update_context(conn)},
            blocker="topic_context_missing_required_fields",
        )

    if "stage_2_resolver_and_workset" not in completed:
        return action_payload(
            conn=conn,
            status="ready",
            stage="stage_2_resolver_and_workset",
            next_action="persist_resolver",
            execution_note=(
                "Choose update_full or update_patch in operation_intent, then write a compact resolver proposal. "
                "The runtime compiles it to the Host Bridge resolver input, executes resolver, graph metrics collection, "
                "and filtered artifact export, then writes runtime/payloads/resolver.json and derives the paper workset."
            ),
            command=(
                f'python scripts/stage_runtime.py --db "{DB}" --action persist_resolver '
                '--payload-file "runtime/payloads/resolver-proposal.json"'
            ),
            required_reads=["recommended_update", "current artifact sections", "current resolver/paper set"],
            required_writes=[
                "runtime/payloads/resolver-proposal.json",
                "runtime-generated runtime/payloads/resolver.json",
                "paper_workset rows",
                "resolver cascade receipts",
            ],
            progress={"completed_stages": sorted(completed)},
        )

    missing_bundles = missing_paper_artifact_bundle_receipt_refs(conn)
    missing_metrics = missing_citation_graph_metric_receipt_refs(conn)
    missing = missing_paper_analysis_receipt_refs(conn)
    if missing_metrics or missing_bundles:
        return action_payload(
            conn=conn,
            status="ready",
            stage="stage_2_resolver_and_workset",
            next_action="persist_resolver",
            execution_note=(
                "Resolver cascade receipts are incomplete. Rerun the Stage 2 resolver proposal action; "
                "runtime will re-execute resolver, graph metrics collection, and filtered artifact export from the locked run root."
            ),
            command=(
                f'python scripts/stage_runtime.py --db "{DB}" --action persist_resolver '
                '--payload-file "runtime/payloads/resolver-proposal.json"'
            ),
            required_reads=["runtime/payloads/resolver-proposal.json", "paper_workset rows"],
            required_writes=[
                "runtime/payloads/resolver.json",
                "runtime/payloads/citation-graph-metrics-batch-*.json",
                "runtime/payloads/paper-artifacts-manifest-batch-*.json",
                "resolver cascade receipts",
            ],
            progress={
                "paper_count": len(paper_refs(conn)),
                "missing_metric_refs": missing_metrics,
                "missing_bundle_refs": missing_bundles,
                "operation": operation,
            },
            blocker="resolver_cascade_incomplete",
        )
    if "stage_5_paper_triage" not in completed:
        if missing:
            batch_refs = missing[:BATCH_SIZE]
            return action_payload(
                conn=conn,
                status="ready",
                stage="stage_5_paper_triage",
                next_action="persist_paper_triage",
                execution_note=(
                    f"Use the persisted host artifact bundle receipts for paper_refs={json.dumps(batch_refs, ensure_ascii=False)}; "
                    "read the filtered artifact content files, then write one LLM-authored paper triage row per paper. "
                    "Each row contains paper_ref, topic_relevance, paper_quality, core_digest, and optional caveats/diagnostics. "
                    "Do not create scripts that generate semantic analysis. "
                    "Subagent batching is recommended when available; restrict each subagent to per-paper triage only."
                ),
                command=(
                    f'python scripts/stage_runtime.py --db "{DB}" --action persist_paper_triage '
                    f'--payload-file "runtime/payloads/paper-triage-batch.json"'
                ),
                required_reads=[
                    "paper_workset batch",
                    "paper_artifact_bundle receipts",
                ],
                required_writes=[
                    "runtime/payloads/paper-triage-batch.json",
                    "runtime/views/cross-paper-evidence-index.json",
                    "paper triage rows",
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
            conn=conn,
            status="ready",
            stage="stage_5_paper_triage",
            next_action="persist_paper_triage",
            execution_note=(
                "Paper triage rows exist but the canonical stage receipt/state is incomplete. "
                "Rerun the batch paper triage persist action with the existing manifest to register the canonical receipt."
            ),
            command=(
                f'python scripts/stage_runtime.py --db "{DB}" --action persist_paper_triage '
                '--payload-file "runtime/payloads/paper-triage-batch.json"'
            ),
            required_reads=["paper triage rows"],
            required_writes=["canonical persist_paper_triage receipt", "stage_5_paper_triage completed"],
            progress={"paper_count": len(paper_refs(conn)), "analyzed_count": len(paper_refs(conn))},
        )

    if (
        "stage_6_cross_paper_map" not in completed
        or "stage_8_core_synthesis" not in completed
        or "stage_9_kg_enrichment" not in completed
        or "stage_10_summary_coverage" not in completed
    ):
        if missing_bundles:
            return action_payload(
                conn=conn,
                status="blocked",
                stage="stage_2_resolver_and_workset",
                next_action="persist_resolver",
                execution_note=(
                    "Every paper needs a resolver-cascade artifact bundle receipt before cross-paper synthesis. "
                    "Rerun Stage 2 to refresh the cascade."
                ),
                command=(
                    f'python scripts/stage_runtime.py --db "{DB}" --action persist_resolver '
                    '--payload-file "runtime/payloads/resolver-proposal.json"'
                ),
                required_reads=["runtime/payloads/resolver-proposal.json", "paper_artifact_bundles"],
                required_writes=["resolver cascade artifact receipts"],
                progress={"missing_bundle_refs": missing_bundles, "operation": operation},
                blocker="resolver_cascade_artifact_receipts_incomplete",
            )
        if missing:
            return action_payload(
                conn=conn,
                status="blocked",
                stage="stage_5_paper_triage",
                next_action="persist_paper_triage",
                execution_note=(
                    "Every paper_workset row needs one paper triage row and its matching "
                    "persist_paper_triage action receipt before cross-paper synthesis."
                ),
                command=(
                    f'python scripts/stage_runtime.py --db "{DB}" --action persist_paper_triage '
                    '--payload-file "runtime/payloads/paper-triage-batch.json"'
                ),
                required_reads=["paper triage rows"],
                required_writes=["runtime/payloads/paper-triage-batch.json", "paper triage rows"],
                progress={"missing_paper_refs": missing},
                blocker="paper_analysis_action_receipts_incomplete",
            )
        source_context_hash = str(get_meta(conn, "source_context_hash", "") or "")
        if not source_context_hash:
            return action_payload(
                conn=conn,
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
                    f'python scripts/stage_runtime.py --db "{DB}" '
                    '--action export_cross_paper_context'
                ),
                required_reads=["paper_workset rows", "paper_artifact_bundles rows", "paper triage rows"],
                required_writes=[
                    "runtime/views/cross-paper-context.md",
                    "runtime/views/external-literature-context.md",
                    "runtime/views/cross-paper-context.manifest.json",
                    "artifact_registry context hashes",
                ],
                progress={"paper_count": len(paper_refs(conn)), "analyzed_count": len(paper_refs(conn)), "operation": operation},
            )
        # Public v3 sequence: export_cross_paper_context -> derive_cross_paper_evidence_map.
        evidence_map_hash = str(get_meta(conn, "cross_paper_evidence_map_hash", "") or "")
        if not evidence_map_hash:
            return action_payload(
                conn=conn,
                status="ready",
                stage="stage_6_cross_paper_map",
                next_action="derive_cross_paper_evidence_map",
                execution_note=(
                    "Derive the cross-paper evidence map from validated paper triage rows. "
                    "This is runtime-maintained provenance; do not ask the agent to author "
                    "cross-paper candidate ids or evidence_map_refs."
                ),
                command=(
                    f'python scripts/stage_runtime.py --db "{DB}" '
                    "--action derive_cross_paper_evidence_map"
                ),
                required_reads=[
                    "runtime/views/cross-paper-context.manifest.json",
                    "runtime/views/cross-paper-evidence-index.json",
                ],
                required_writes=[
                    "runtime/payloads/cross-paper-evidence-map.json",
                    "runtime-derived cross-paper evidence map receipt",
                ],
                progress={"completed_stages": sorted(completed), "operation": operation},
            )
        core_sections_hash = str(get_meta(conn, "core_analytical_sections_hash", "") or "")
        if not core_sections_hash:
            return action_payload(
                conn=conn,
                status="ready",
                stage="stage_8_core_synthesis",
                next_action="persist_core_synthesis",
                execution_note=(
                    "Draft one core synthesis payload with taxonomy, timeline_events, positioning, claims, "
                    "improvement_dimension_summary, improvement_dimensions, debates, gaps, review_outline, "
                    "and concept_candidate_labels. Use source_paper_refs where evidence is needed."
                ),
                command=(
                    f'python scripts/stage_runtime.py --db "{DB}" '
                    '--action persist_core_synthesis --payload-file "runtime/payloads/core-analytical-sections.json"'
                ),
                required_reads=[
                    "references/step_08_core_synthesis.md",
                    "runtime/views/cross-paper-context.md",
                    "runtime/views/external-literature-context.md",
                    "runtime/payloads/cross-paper-evidence-map.json",
                ],
                required_writes=[
                    "runtime/payloads/core-analytical-sections.json",
                    "validated core analytical sections receipt",
                ],
                progress={"completed_stages": sorted(completed), "operation": operation},
            )
        kg_concept_path = str(get_meta(conn, "concept_cards_proposal_path", "") or "")
        kg_relation_path = str(get_meta(conn, "topic_graph_relation_proposals_path", "") or "")
        if not kg_concept_path or not kg_relation_path:
            return action_payload(
                conn=conn,
                status="ready",
                stage="stage_9_kg_enrichment",
                next_action="persist_kg_enrichment",
                execution_note=(
                    "Draft KG enrichment after core synthesis. "
                    "Read step_09_kg_enrichment.md, core synthesis, both context markdown files, and the evidence map. "
                    "The payload contains concept_details[], topic_relation_candidates[], topic_matching_terms, and optional diagnostics[]."
                ),
                command=(
                    f'python scripts/stage_runtime.py --db "{DB}" '
                    '--action persist_kg_enrichment --payload-file "runtime/payloads/kg-enrichment.json"'
                ),
                required_reads=[
                    "references/step_09_kg_enrichment.md",
                    "runtime/payloads/core-analytical-sections.json",
                    "runtime/views/cross-paper-context.md",
                    "runtime/views/external-literature-context.md",
                ],
                required_writes=[
                    "runtime/payloads/kg-enrichment.json",
                    "result/sidecars/concept-cards-proposal.json",
                    "result/sidecars/topic-graph-relation-proposals.json",
                    "validated KG enrichment receipt",
                ],
                progress={"completed_stages": sorted(completed), "operation": operation},
            )
        return action_payload(
            conn=conn,
            status="ready",
            stage="stage_10_summary_coverage",
            next_action="finalize_summary_coverage",
            execution_note=(
                "Write the final summary coverage payload. "
                "Read step_10_summary_coverage.md, core synthesis, both context markdown files, and the validated evidence map. "
                "The payload contains summary, coverage, reliability_caveats, external_context_summary, collection_suggestions, and optional diagnostics."
            ),
            command=(
                f'python scripts/stage_runtime.py --db "{DB}" --operation "{operation}" '
                f'--language "{language}" --action finalize_summary_coverage '
                '--payload-file "runtime/payloads/external-statistics-report.json"'
            ),
            required_reads=[
                "references/step_10_summary_coverage.md",
                "references/section_examples.md",
                "runtime/payloads/core-analytical-sections.json",
                "runtime/views/cross-paper-context.md",
                "runtime/views/external-literature-context.md",
                "runtime/views/cross-paper-evidence-index.json",
                "current artifact sections",
                "read_section_hashes",
            ],
            required_writes=[
                "runtime/payloads/external-statistics-report.json",
                "prevalidated Stage 10 sections",
                "runtime-materialized result/sections/*.json",
            ],
            progress={"completed_stages": sorted(completed), "operation": operation},
        )

    if missing_bundles or missing:
        return action_payload(
            conn=conn,
            status="blocked",
            stage="stage_11_render_and_validate",
            next_action="repair_resolver_cascade_or_paper_triage_before_render",
            execution_note=(
                "Render is blocked because resolver-cascade artifact receipts or paper triage receipts are incomplete. "
                "Rerun the gate-directed Stage 2 cascade or paper triage action; direct SQLite rows are not valid state."
            ),
            command=f'python scripts/stage_runtime.py --db "{DB}" --action audit_runtime_integrity',
            required_reads=["action_receipts", "paper_artifact_bundles", "paper_analysis"],
            required_writes=[],
            progress={
                "missing_resolver_cascade_bundle_receipt_refs": missing_bundles,
                "missing_analysis_action_receipt_refs": missing,
            },
            blocker="resolver_cascade_or_paper_triage_receipts_incomplete",
        )

    if "stage_11_render_and_validate" not in completed:
        return action_payload(
            conn=conn,
            status="ready",
            stage="stage_11_render_and_validate",
            next_action="validate_final_artifacts",
            execution_note=(
                "Validate agent-authored result/sections JSON files, generate the structured manifest/result bundle, "
                "and register artifact_registry. Host apply performs any canonical export after structured persistence."
            ),
            command=(
                f'python scripts/stage_runtime.py --db "{DB}" '
                f'--operation "{operation}" --language "{language}" --action validate_final_artifacts'
            ),
            required_reads=["result/sections/*.json", "artifact metadata", "read_section_hashes"],
            required_writes=[
                "result/sections/*.json",
                "result/topic-analysis*.json",
                "result/sidecars/topic-interest-metadata.json",
                "result/final-output.candidate.json",
            ],
            progress={"completed_stages": sorted(completed), "operation": operation},
        )

    if not all_required_final_artifacts_registered(conn, operation=operation):
        return action_payload(
            conn=conn,
            status="blocked",
            stage="stage_12_completed",
            next_action="register_validated_section_manifest_and_final_stdout",
            execution_note="Final manifest and stdout are not registered in artifact_registry.",
            command=(
                f'python scripts/stage_runtime.py --db "{DB}" '
                f'--operation "{operation}" --language "{language}" --action validate_final_artifacts'
            ),
            required_reads=["artifact_registry"],
            required_writes=["validated final artifacts"],
            blocker="final_artifacts_unregistered",
        )

    if stage_state(conn, "stage_12_completed") != "completed":
        return action_payload(
            conn=conn,
            status="ready",
            stage="stage_12_completed",
            next_action="complete",
            execution_note="Artifacts are registered; emit the generated business JSON and stop.",
            command='Get-Content -Encoding UTF8 "result/final-output.candidate.json"',
            required_reads=["result/final-output.candidate.json"],
            required_writes=["assistant final JSON only"],
        )

    return action_payload(
        conn=conn,
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
