## Design Source

This change explicitly implements the contracts captured in:

- `artifact/synthesis-agent-payload-simplification-notes.md`
- `artifact/synthesis-token-calibration-20260605/stats/summary.json`
- `artifact/synthesis-token-calibration-20260605/stats/summary.md`

The design artifact remains the detailed rationale document. This OpenSpec
change turns that rationale into implementable requirements and acceptance
criteria.

## Agent/Runtime Boundary

The skill should treat the agent as a semantic author, not a database payload
assembler. The new boundary is:

- Agent writes compact semantic payloads with flat, self-explanatory fields.
- Runtime executes resolver, graph metrics, artifact availability, paper
  scoring, context selection, provenance indexing, sidecar wrapping, evidence
  closure, statistics, and final report rendering.
- Host apply validates operation-specific preconditions and persists only after
  stdout schema validation.

Fields such as `cross_paper_evidence_map`, `paper_evidence`, `evidence_refs`,
`evidence_map_refs`, `timeline_events.markers`, `seed_paper_refs`,
`statistics.graph_statistics`, and `synthesis_report` are runtime-owned or
runtime-materialized unless explicitly stated otherwise.

## Operation-Specific CAS

The final output schema is an operation-discriminated union:

```json
{
  "create": {
    "forbidden": ["base_hashes"],
    "precondition": "topic_absent"
  },
  "update_full": {
    "required": ["base_hashes"],
    "precondition": "bundle_hashes_match"
  },
  "update_patch": {
    "required": ["read_section_hashes"],
    "precondition": "read_sections_match"
  }
}
```

For compatibility, host apply ignores legacy `base_hashes` in a create bundle
and records a warning, but create never becomes an update. If the target topic
already exists, create fails with `topic_exists` or `duplicate_topic` even when
legacy hashes happen to match current files.

## Stage Shape

The implementation should preserve the current broad workflow phases while
changing what the agent authors:

- Stage 1 derives topic id from title unless an explicit id is already accepted
  by contract, and flattens duplicate-check intent into agent-friendly fields.
- Stage 2 separates agent-authored resolver proposal from runtime resolver
  execution receipt, then hard-cascades graph metrics and artifact/evidence
  collection in the same runtime action.
- Stage 3 graph metrics and Stage 4 artifact/evidence collection are not
  agent-facing stages; no independent gate action or schema is retained for
  them.
- Stage 5 becomes `paper_triage`: relevance, quality, and one- or two-sentence
  `core_digest` only. Gate guidance should encourage subagent batching when
  available.
- Stage 6 becomes `prepare_cross_paper_context`: runtime scores papers,
  selects full-context slots, writes core/external context views, and writes a
  provenance index.
- Old Stage 7/8 merge into `persist_core_synthesis`: taxonomy, timeline,
  positioning, claims, improvement dimensions, debates, gaps, review outline,
  and `concept_candidate_labels[]`.
- Stage 9 becomes `persist_kg_enrichment`: agent enriches concept details,
  topic relation candidates, and topic matching terms; runtime writes the
  required sidecars.
- Stage 10 becomes `finalize_summary_coverage`: agent writes summary,
  coverage/reliability interpretation, external context summary, and collection
  suggestions; runtime generates statistics and the final report.
- Stage 11 writes `result/final-output.candidate.json` with
  `__SKILL_DONE__: true`.
- Stage 12 emits the candidate envelope as stdout; orchestrator strips
  `__SKILL_DONE__` and writes accepted `result/result.json`.

## Cross-Paper Context Selection

Runtime uses deterministic scoring from Stage 5 relevance/quality, artifact
availability, and graph role hints. All papers may contribute metadata and
`core_digest`; only selected papers receive full context.

Calibrated constants:

```json
{
  "core_analysis_basis_quantile": "p90",
  "external_literature_basis_quantile": "p75",
  "core_analysis_full_context_tokens_per_paper": 1500,
  "external_literature_full_context_tokens_per_paper": 7750,
  "core_analysis_budget_tokens": 200000,
  "external_literature_budget_tokens": 200000,
  "safety_margin_ratio": 0.10,
  "usable_budget_tokens": 180000,
  "core_analysis_full_context_slot_count": 120,
  "external_literature_full_context_slot_count": 23
}
```

These constants are measured with `o200k_base` over filtered artifacts from the
local Zotero library. They are constants for runtime planning, not dynamic
agent-authored values.

## Evidence and Timeline

Agent-authored sections cite `source_paper_refs`. Runtime validates refs,
assigns stable paper evidence ids, materializes `paper_evidence`, fills
`evidence_refs`, and compiles `semantic_evidence_map` from final sections.

Timeline rendering uses `timeline_events.markers` as first-class artifact data.
Agent-facing payloads do not include `marker_kind`; every agent-authored
timeline event is a milestone. Runtime derives marker `kind`, year, paper
evidence id, event id, and deduplication from paper metadata and event refs.

## KG Enrichment

Core synthesis surfaces `concept_candidate_labels[]`. Runtime normalizes labels
and queries Concept KB / alias index before Stage 9. Stage 9 agent payloads
provide only enrichment fields needed for dedupe and topic matching:

- concept details: label, aliases, concept type, domain, definition,
  disambiguation, topic relevance, caveat;
- topic relation candidates with explicit relation enum, rationale, evidence,
  confidence, caveat;
- topic matching terms without agent-authored seed paper refs.

Runtime derives `seed_literature_item_ids` from Stage 5/6 ordering and writes
the required `concept_cards_proposal`, `topic_graph_relation_proposals`, and
`topic_interest_metadata` sidecars.

## External Statistics and Report

External analysis is reduced to collection guidance. Agent does not maintain an
external references index, canonical external reference dedupe, or report body.

Graph statistics come from a topic-scoped graph/cluster query. If the graph is
missing or stale, runtime records caveats rather than asking the agent to fill
numbers.

The final `synthesis_report` is deterministically rendered from validated
sections and Stage 10 interpretation fields using a fixed template.

## Host Bridge Additions

The simplified path needs these read-only capabilities:

- `synthesis.query_concept_kb` / CLI `synthesis query-concept-kb`
- `synthesis.query_citation_graph_cluster` / CLI
  `synthesis query-citation-graph-cluster`
- richer `synthesis.get_schemas` output including operation-specific CAS
  contracts, payload schema manifests, enum definitions, and artifact section
  summaries.

These capabilities should be side-effect free and bounded.

## Compatibility

- Existing topic artifacts without `timeline_events.markers` fallback to current
  UI derivation.
- Existing artifacts with `comparison_matrix` but without
  `improvement_dimensions` fallback to Compare rendering.
- Existing create bundles with `base_hashes` are treated as legacy noise and
  do not affect create precondition decisions.
- Database tables should remain stable unless implementation discovers a hard
  blocker. New behavior should prefer runtime materialization, host apply
  logic, and adapter changes.
