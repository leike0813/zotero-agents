# acp-skill-mq274qrr-3ept5q Diagnostic

## Source

- Workflow: `create-topic-synthesis`
- Sequence run id: `run-mq26kale-ogx9key5`
- Finalize request id: `acp-skill-mq274qrr-3ept5q`
- Reused workspace: `runtime/acp/skill-runs/acp-skill-mq26kamz-l43wyn`
- Skill: `topic-synthesis-finalize`
- Observed timestamps: `2026-06-06T10:14:21.989Z` through
  `2026-06-06T10:16:04.217Z`

Local absolute roots are intentionally omitted from this artifact.

## Sequence Evidence

The runtime log records:

- `prepare` step started with `create-topic-synthesis-prepare` and workspace
  mode `new`.
- `core` step started with `topic-synthesis-core-enrichment` and workspace mode
  `reuse`.
- `finalize` step started with `topic-synthesis-finalize` and workspace mode
  `reuse`.
- `acp-skill-mq274qrr-3ept5q` succeeded as the final step.
- `applyResult` started immediately after provider execution finished.
- `applyResult` failed in Host apply.

## Final Candidate Summary

`result/final-output.candidate.json` existed and had this shape:

```json
{
  "kind": "topic_synthesis",
  "operation": "create",
  "language": "zh-CN",
  "topic_definition": {
    "id": "detr-style-object-detection",
    "title": "DETR-style Object Detection"
  },
  "resolver_manifest_path": "runtime/payloads/resolver.json",
  "analysis_manifest_path": "result/topic-analysis.json",
  "candidate_output_path": "result/final-output.candidate.json",
  "artifact_metadata": {
    "runtime": "split-skill"
  }
}
```

No ACP `__SKILL_DONE__` marker was present in the business candidate.

## Manifest Mismatch

`result/topic-analysis.json` existed but only contained:

- `sections.summary`
- `sections.coverage`
- `sidecars.concept_cards_proposal`
- `sidecars.topic_graph_relation_proposals`
- `sidecars.topic_interest_metadata`

The section entries lacked `content_type: "json"`. The sidecar entries lacked
`content_type: "json"` and `schema_id`.

Host apply expected the complete `synthesis.topic_analysis_manifest` section
set:

- `topic`
- `summary`
- `positioning`
- `taxonomy`
- `improvement_dimension_summary`
- `improvement_dimensions`
- `claims`
- `timeline_events`
- `paper_evidence`
- `external_literature_analysis`
- `debates`
- `coverage`
- `gaps`
- `review_outline`
- `statistics`
- `synthesis_report`
- `evidence_map`
- `source_artifacts`
- `diagnostics`

## Apply Failure

Host apply failed in `loadCompleteManifestAndSections` with an invalid topic
analysis manifest error. The first reported issues were:

- `sections.topic is required`
- `summary.content_type must be json`
- `sections.positioning is required`
- `sections.taxonomy is required`
- required sidecars missing `content_type` and `schema_id`

## Root Cause

The split finalize runtime produced a minimal result manifest suitable for
smoke validation, not the complete structured artifact contract consumed by
Host apply, storage, topic graph ingestion, discovery hints, and topic details.

The correct fix is to make split finalize materialize a Host-apply-ready
structured artifact, not to weaken Host apply validation.
