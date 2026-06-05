## 1. OpenSpec and Design Traceability

- [x] Add delta specs for skill payloads, runtime materialization, workflow
  apply, structured artifact fields, host bridge queries, and Topic Details UI.
- [x] Ensure proposal/design/tasks explicitly reference
  `artifact/synthesis-agent-payload-simplification-notes.md`.
- [x] Validate the change with OpenSpec.

## 2. Skill Output Schema and CAS Contract

- [x] Update create output schema so `operation: "create"` does not require and
  does not document `base_hashes`.
- [x] Update update output schema so `operation: "update_full"` requires
  `base_hashes`.
- [x] Update update output schema so `operation: "update_patch"` requires
  `read_section_hashes`.
- [x] Update schema docs/examples so legacy create `base_hashes` are described
  only as compatibility noise handled by host apply.
- [x] Extend `synthesis.get_schemas` response with actual output schema,
  stage payload schema manifest, enum definitions, artifact section summaries,
  and operation-specific CAS contract.

## 3. Create/Update Skill Payload Simplification

- [x] Update create/update `SKILL.md` and `references/step_*.md` to reflect the
  simplified stage path in the design artifact.
- [x] Flatten Stage 1 topic context payload and derive topic id from title in
  runtime where needed.
- [x] Split Stage 2 resolver proposal from runtime resolver execution receipt.
- [x] Absorb Stage 3 graph metrics and Stage 4 artifact/evidence collection
  into the Stage 2 runtime cascade, with no independent agent-facing gate
  action or schema.
- [x] Replace Stage 5 paper unit analysis with `paper_triage` assessments:
  relevance, quality, and `core_digest`.
- [x] Add gate guidance that encourages subagent batching for Stage 5 and
  provides a concrete prompt skeleton.
- [x] Merge old Stage 7/8 payloads into `persist_core_synthesis`.
- [x] Replace agent-authored `comparison_matrix` with
  `improvement_dimension_summary` and `improvement_dimensions[]`.
- [x] Add `concept_candidate_labels[]` to core synthesis output.
- [x] Replace Stage 9 sidecar authoring with KG enrichment payload.
- [x] Replace Stage 10 report/statistics authoring with
  `finalize_summary_coverage`.
- [x] Re-audit Stage 1 after implementation and align create/update
  `persist_topic_context` schemas, SKILL guidance, gate instructions, and
  runtime normalization with the flat/host-context contract.
- [x] Re-audit Stage 2 after implementation and align create/update
  `persist_resolver` schemas, SKILL guidance, gate instructions, and runtime
  execution with the resolver-proposal / Host Bridge execution contract.

## 4. Runtime Materialization

- [x] Implement runtime paper scoring and context selection using calibrated
  constants from the design artifact.
- [x] Generate core and external context views from deterministic selection.
- [x] Generate `source_paper_evidence_index` / provenance index without asking
  the agent to author a semantic evidence map.
- [x] Derive final `paper_evidence`, `evidence_refs`, and `semantic_evidence_map`
  from validated section `source_paper_refs`.
- [x] Derive `timeline_events.markers` from timeline events, source paper refs,
  paper evidence, and bibliographic metadata.
- [x] Materialize KG sidecars from enrichment payload and runtime-derived
  matching context.
- [x] Query topic-scoped graph data and materialize deterministic statistics
  and graph caveats.
- [x] Render `synthesis_report` from fixed template and validated sections.
- [x] Write `result/final-output.candidate.json` with `__SKILL_DONE__: true`
  instead of writing accepted `result/result.json`.

## 5. Host Bridge and CLI

- [x] Add read-only Concept KB / alias index query capability and CLI command.
- [x] Add read-only topic-scoped citation graph cluster query capability and
  CLI command.
- [x] Keep both capabilities bounded and side-effect free.
- [x] Update manifest/help text so agents can discover required input shapes and
  enum values.

## 6. Workflow Apply and Persistence

- [x] Apply create precondition as topic absence only.
- [x] Ignore non-empty legacy create `base_hashes` with warning when topic is
  absent.
- [x] Reject create with `topic_exists` or `duplicate_topic` when topic exists,
  without falling through to update logic.
- [x] Apply `update_full` CAS using current manifest/artifact/export/metadata
  hashes.
- [x] Apply `update_patch` CAS using only `read_section_hashes`.
- [x] Ensure `update_patch` still runs resolver before patch apply.
- [x] Reject patches that still reference removed papers after resolver delta.
- [x] Preserve structured apply failures and warnings through workflow UI/API
  boundaries.

## 7. Topic Details UI

- [x] Render timeline from `timeline_events.markers` when present.
- [x] Keep legacy timeline marker derivation fallback for older artifacts.
- [x] Render Improvement / Dimensions from `improvement_dimensions[]`.
- [x] Keep legacy Compare fallback for artifacts that only contain
  `comparison_matrix`.
- [x] Confirm topic details layout does not require a database schema change.

## 8. Tests and Verification

- [x] Add/update focused schema tests for operation-discriminated output
  contracts.
- [x] Add/update host apply tests for create absence, legacy create hash
  warning, create conflict, update full CAS, and update patch CAS.
- [x] Add/update runtime tests for context selection, provenance/evidence
  derivation, timeline marker derivation, KG sidecar materialization, and report
  rendering.
- [x] Add/update Host Bridge CLI/capability tests for concept query, graph
  cluster query, and schema contract discovery.
- [x] Add/update UI adapter tests for timeline markers and improvement
  dimensions without brittle text snapshots.
- [x] Run targeted tests, typecheck, lint/format checks, and OpenSpec
  validation.
