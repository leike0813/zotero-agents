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
STAGE_ORDER = (
    "stage_0_bootstrap",
    "stage_1_topic_intent",
    "stage_2_resolver",
    "stage_3_paper_workset",
    "stage_4_per_paper_analysis",
    "stage_5_cross_paper_synthesis",
    "stage_6_render_and_validate",
    "stage_7_completed",
)


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
    value = {
        "status": status,
        "stage": stage,
        "next_action": next_action,
        "execution_note": execution_note,
        "command_example": command,
        "required_reads": required_reads,
        "required_writes": required_writes,
        "progress": progress or {},
    }
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
            stage="stage_7_completed",
            next_action="emit_topic_synthesis_canceled",
            execution_note="Run is canceled. Do not render sections.",
            command=f'python scripts/stage_runtime.py --db "{DB}" --action cancel',
            required_reads=[],
            required_writes=["final canceled JSON"],
        )
    if has_any_state(conn, ("failed_terminal",)):
        return action_payload(
            status="failed_terminal",
            stage="stage_7_completed",
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
            next_action="retry_current_stage",
            execution_note="Fix the malformed or missing payload, then rerun gate. Do not jump to a later stage.",
            command=f'python scripts/gate_runtime.py --db "{DB}"',
            required_reads=["stage error in SQLite"],
            required_writes=[],
        )

    completed = completed_stages(conn)
    if "stage_1_topic_intent" not in completed:
        return action_payload(
            status="ready",
            stage="stage_1_topic_intent",
            next_action="persist_topic_intent",
            execution_note=(
                "Do duplicate check with synthesis.list_topics, define topic intent, "
                "then persist it with the payload-file command. Do not hand-edit SQLite."
            ),
            command=(
                f'python scripts/stage_runtime.py --db "{DB}" --action persist_topic_intent '
                '--payload-file "runtime/payloads/topic-intent.json"'
            ),
            required_reads=["topicSeed", "language", "synthesis.list_topics"],
            required_writes=["runtime/payloads/topic-intent.json", "topic_intent rows"],
            progress={"completed_stages": sorted(completed)},
        )

    topic_definition = get_key_value(conn, "topic_intent", "topic_definition", {})
    if not isinstance(topic_definition, dict) or not str(topic_definition.get("id") or "").strip():
        return action_payload(
            status="blocked",
            stage="stage_1_topic_intent",
            next_action="repair_topic_definition",
            execution_note=(
                "Stage 1 is incomplete: runtime requires topic_definition.id and topic_definition.title. "
                "Map any legacy intent payload to topic_definition and rerun persist_topic_intent."
            ),
            command=(
                f'python scripts/stage_runtime.py --db "{DB}" --action persist_topic_intent '
                '--payload-file "runtime/payloads/topic-intent.json"'
            ),
            required_reads=["runtime/payloads/topic-intent.json", "topic_intent rows"],
            required_writes=["topic_definition.id", "topic_definition.title"],
            blocker="topic_definition_missing_id",
        )

    if "stage_2_resolver" not in completed:
        index_status = library_index_status(conn)
        if not index_status.get("complete"):
            cursor = str(index_status.get("next_cursor") or "0")
            safe_cursor = cursor.replace(":", "_").replace("/", "_").replace("\\", "_") or "0"
            args_hint = '{"limit":100}' if cursor == "0" else '{"cursor":"' + cursor + '","limit":100}'
            return action_payload(
                status="ready",
                stage="stage_2_resolver",
                next_action="persist_library_index_page",
                execution_note=(
                    "Read the next compact complete-library-index page with MCP synthesis.get_library_index, "
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
                    f"MCP synthesis.get_library_index {args_hint}",
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
            stage="stage_2_resolver",
            next_action="persist_resolver",
            execution_note=(
                "Build a reproducible resolver from the completed library index receipt, "
                "call synthesis.resolve_resolver, then persist resolver diagnostics and resolved_paper_set."
            ),
            command=(
                f'python scripts/stage_runtime.py --db "{DB}" --action persist_resolver '
                '--payload-file "runtime/payloads/resolver.json"'
            ),
            required_reads=["topic_intent", "complete library_index_pages receipt", "synthesis.resolve_resolver"],
            required_writes=["runtime/payloads/resolver.json", "topic_resolver rows"],
            progress={"completed_stages": sorted(completed)},
        )

    missing_bundles = missing_paper_artifact_bundle_receipt_refs(conn)
    missing_metrics = missing_citation_graph_metric_receipt_refs(conn)
    missing = missing_paper_analysis_receipt_refs(conn)
    if "stage_4_per_paper_analysis" not in completed:
        if "stage_3_paper_workset" not in completed:
            return action_payload(
                status="blocked",
                stage="stage_4_per_paper_analysis",
                next_action="derive_paper_workset_before_per_paper_analysis",
                execution_note="paper_workset is derived by persist_resolver; rerun resolver persistence if it is missing.",
                command=f'python scripts/gate_runtime.py --db "{DB}"',
                required_reads=["paper_workset"],
                required_writes=[],
                blocker="paper_workset_not_completed",
            )
        if missing_metrics:
            batch_refs = missing_metrics[:BATCH_SIZE]
            refs_json = json.dumps(batch_refs, ensure_ascii=False)
            return action_payload(
                status="ready",
                stage="stage_4_per_paper_analysis",
                next_action="persist_citation_graph_metrics",
                execution_note=(
                    f"Call MCP synthesis.get_citation_graph_metrics for the current paper_workset batch paperRefs={refs_json}; "
                    "persist the returned bounded metrics summary before artifact export. Metrics are auxiliary graph-derived signals only: "
                    "they can guide paper ordering, role hints, coverage/gaps, and external-heavy diagnostics, but never replace digest evidence."
                ),
                command=(
                    f'python scripts/stage_runtime.py --db "{DB}" --action persist_citation_graph_metrics '
                    '--payload-file "runtime/payloads/citation-graph-metrics-batch.json"'
                ),
                required_reads=[
                    "paper_workset batch",
                    'MCP synthesis.get_citation_graph_metrics {"paperRefs":' + refs_json + ',"sortBy":"foundation","limit":' + str(len(batch_refs)) + "}",
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
                stage="stage_4_per_paper_analysis",
                next_action="persist_filtered_artifact_manifest",
                execution_note=(
                    f"Call MCP synthesis.export_filtered_paper_artifacts with run_root set to the absolute current ACP run workspace and paper_refs={refs_json}; "
                    "the host writes runtime/payloads/paper-artifacts-manifest.json plus filtered content files. "
                    "Then persist the manifest below. Do not hand-write artifact files or hashes."
                ),
                command=(
                    f'python scripts/stage_runtime.py --db "{DB}" --run-root "." --action persist_filtered_artifact_manifest '
                    f'--payload-file "runtime/payloads/paper-artifacts-manifest.json"'
                ),
                required_reads=[
                    "paper_workset batch",
                    'MCP synthesis.export_filtered_paper_artifacts {"run_root":"<absolute current run workspace>","paper_refs":' + refs_json + "}",
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
                stage="stage_4_per_paper_analysis",
                next_action="persist_paper_analyses",
                execution_note=(
                    f"Use the persisted host artifact bundle receipts for paper_refs={json.dumps(batch_refs, ensure_ascii=False)}; "
                    "read the filtered artifact content files, then write one LLM-authored enhanced paper-unit analysis row per paper into an analysis manifest. "
                    "Stage 4 is the only paper-level extraction step: include bibliographic, topic_relevance, research_problem, method_contribution, "
                    "evaluation_context, findings, limitations, taxonomy_hints, timeline_candidates, claim_support_candidates, comparison_facts, "
                    "external_references, citation_contexts, and missing_payloads. "
                    "Do not include payload_hash, digest_ref, or digest_locator; runtime injects digest locators without sending hashes through LLM tokens. "
                    "Do not create scripts that generate semantic analysis. "
                    "comparison_facts must stay paper-local and must not compare against other paper_refs. "
                    "persist_paper_analyses will reject claim/timeline candidates if digest is missing, "
                    "and external/citation rows if their source artifacts are missing."
                ),
                command=(
                    f'python scripts/stage_runtime.py --db "{DB}" --run-root "." --action persist_paper_analyses '
                    f'--payload-file "runtime/payloads/paper-analyses-batch.json"'
                ),
                required_reads=[
                    "paper_workset batch",
                    "paper_artifact_bundle receipts",
                ],
                required_writes=[
                    "runtime/payloads/paper-analyses-batch.json",
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
            stage="stage_4_per_paper_analysis",
            next_action="complete_per_paper_analysis_stage",
            execution_note="All paper_analysis rows exist. Continue to cross-paper context export.",
            command=f'python scripts/gate_runtime.py --db "{DB}"',
            required_reads=["paper_analysis rows"],
            required_writes=[],
            progress={"paper_count": len(paper_refs(conn)), "analyzed_count": len(paper_refs(conn))},
        )

    if "stage_5_cross_paper_synthesis" not in completed:
        if missing_bundles:
            return action_payload(
                status="blocked",
                stage="stage_5_cross_paper_synthesis",
                next_action="complete_artifact_bundle_receipts_before_cross_paper_synthesis",
                execution_note=(
                    "Every paper needs a host artifact bundle row and its matching "
                    "persist_filtered_artifact_manifest action receipt before cross-paper synthesis."
                ),
                command=f'python scripts/gate_runtime.py --db "{DB}"',
                required_reads=["paper_artifact_bundles"],
                required_writes=[],
                progress={"missing_bundle_refs": missing_bundles},
                blocker="artifact_bundle_action_receipts_incomplete",
            )
        if missing:
            return action_payload(
                status="blocked",
                stage="stage_5_cross_paper_synthesis",
                next_action="complete_per_paper_analysis_before_cross_paper_synthesis",
                execution_note=(
                    "Every paper_workset row needs one paper_analysis row and its matching "
                    "persist_paper_analysis action receipt before cross-paper synthesis."
                ),
                command=f'python scripts/gate_runtime.py --db "{DB}"',
                required_reads=["paper_analysis rows"],
                required_writes=[],
                progress={"missing_paper_refs": missing},
                blocker="paper_analysis_action_receipts_incomplete",
            )
        source_context_hash = str(get_meta(conn, "source_context_hash", "") or "")
        if not source_context_hash:
            return action_payload(
                status="ready",
                stage="stage_5_cross_paper_synthesis",
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
        evidence_map_hash = str(get_meta(conn, "cross_paper_evidence_map_hash", "") or "")
        if not evidence_map_hash:
            return action_payload(
                status="ready",
                stage="stage_5_cross_paper_synthesis",
                next_action="draft_cross_paper_evidence_map",
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
                    '--action validate_cross_paper_evidence_map --payload-file "runtime/payloads/cross-paper-evidence-map.json"'
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
        return action_payload(
            status="ready",
            stage="stage_5_cross_paper_synthesis",
            next_action="write_final_sections",
            execution_note=(
                "LLM-authored final sections are required now. Read the validated cross-paper evidence map, "
                "runtime/views/cross-paper-context.md, runtime/views/external-literature-context.md, and runtime/views/cross-paper-evidence-index.json. "
                "Write result/sections/*.json including positioning, taxonomy, comparison_matrix, debates, review_outline, and evidence_map. "
                "Every claim/taxonomy/comparison/debate/gap/review-outline row must cite evidence_map candidate ids. "
                "Scripts must not generate semantic sections."
            ),
            command=f'python scripts/stage_runtime.py --db "{DB}" --run-root "." --operation "{operation}" --language "{language}" --action validate_final_artifacts',
            required_reads=[
                "runtime/views/cross-paper-context.md",
                "runtime/views/external-literature-context.md",
                "runtime/views/cross-paper-evidence-index.json",
                "runtime/payloads/cross-paper-evidence-map.json",
                "topic_intent",
                "topic_resolver",
            ],
            required_writes=["result/sections/*.json", "validated final artifacts"],
            progress={"completed_stages": sorted(completed)},
        )

    if missing_bundles or missing:
        return action_payload(
            status="blocked",
            stage="stage_6_render_and_validate",
            next_action="repair_stage4_action_receipts_before_render",
            execution_note=(
                "Render is blocked because Stage 4 rows are not backed by package-local "
                "stage action receipts. Re-run the gate-directed persist_filtered_artifact_manifest "
                "and persist_paper_analysis actions; direct SQLite rows are not valid state."
            ),
            command=f'python scripts/gate_runtime.py --db "{DB}"',
            required_reads=["action_receipts", "paper_artifact_bundles", "paper_analysis"],
            required_writes=[],
            progress={
                "missing_bundle_action_receipt_refs": missing_bundles,
                "missing_analysis_action_receipt_refs": missing,
            },
            blocker="stage4_action_receipts_incomplete",
        )

    if "stage_6_render_and_validate" not in completed:
        return action_payload(
            status="ready",
            stage="stage_6_render_and_validate",
            next_action="validate_final_artifacts",
            execution_note=(
                "Validate agent-authored result/sections JSON files, generate manifests/result bundle, "
                "and register artifact_registry."
            ),
            command=(
                f'python scripts/stage_runtime.py --db "{DB}" --run-root "." '
                f'--operation "{operation}" --language "{language}" --action validate_final_artifacts'
            ),
            required_reads=["result/sections/*.json", "paper_analysis rows", "artifact metadata"],
            required_writes=["result/sections/*.json", "result/topic-analysis.json", "result/preview.md", "result/result.json"],
            progress={"completed_stages": sorted(completed)},
        )

    if not all_required_final_artifacts_registered(conn, operation=operation):
        return action_payload(
            status="blocked",
            stage="stage_7_completed",
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

    if stage_state(conn, "stage_7_completed") != "completed":
        return action_payload(
            status="ready",
            stage="stage_7_completed",
            next_action="complete",
            execution_note="Artifacts are registered; the skill can emit result/result.json and stop.",
            command='Get-Content -Encoding UTF8 "result/result.json"',
            required_reads=["result/result.json"],
            required_writes=["assistant final JSON only"],
        )

    return action_payload(
        status="completed",
        stage="stage_7_completed",
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
