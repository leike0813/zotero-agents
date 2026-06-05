## Why

The create/update topic synthesis skills now ask agents to author large,
deeply nested JSON payloads with cross-stage constraints. This slows execution,
raises schema error rates, and encourages agents to fill runtime-owned data
such as evidence maps, artifact availability, graph statistics, final report
text, and create-time CAS hashes.

This change is grounded in the design artifact
`artifact/synthesis-agent-payload-simplification-notes.md`. That artifact is
the source of truth for the agreed simplification principles, stage-by-stage
payload redesign, operation-specific CAS contract, host bridge capability gaps,
and UI/UX compatibility constraints. The token constants in this change also
reference the calibration artifacts under
`artifact/synthesis-token-calibration-20260605/`.

## What Changes

- Split create/update validation contracts by operation:
  - `create` forbids agent-authored `base_hashes` and uses topic absence as
    its only apply precondition.
  - `update_full` requires `base_hashes`.
  - `update_patch` requires `read_section_hashes` and must pass resolver before
    patch application.
- Simplify agent-facing stage payloads:
  - move runtime/host-only work out of the agent path;
  - reduce Stage 5 to paper triage;
  - convert Stage 6 into runtime-only context/provenance preparation;
  - merge old Stage 7/8 into one core synthesis payload;
  - replace `comparison_matrix` authoring with improvement dimension analysis;
  - move KG sidecar wrapping to runtime;
  - reduce final summary/coverage work to interpretation and collection
    suggestions.
- Preserve required KG proposal sidecars on the main path, while changing the
  agent task from sidecar schema authoring to concept/topic enrichment.
- Make runtime derive paper evidence, evidence refs, evidence maps, timeline
  markers, graph statistics, and synthesis report materialization from
  validated sections and host data.
- Change final result emission so skill runtime writes
  `result/final-output.candidate.json` and the orchestrator writes accepted
  `result/result.json` only after stdout schema validation.
- Add host bridge/CLI read capabilities needed by the simplified flow:
  Concept KB / alias index query, topic-scoped citation graph cluster query,
  and richer schema/CAS discovery.
- Keep existing database table structure unless implementation discovers a
  specific blocker; prioritize host apply, materialization, adapters, and
  sidecar ingest changes.
- Update Topic Details UI adapters to consume the new timeline markers and
  improvement dimensions while preserving old-artifact fallbacks.

## Capabilities

### Modified Capabilities

- `topic-synthesis-skills`: create/update skills expose smaller,
  operation-discriminated, stage-local payload schemas.
- `topic-synthesis-runtime-contract`: runtime owns context selection,
  provenance index, evidence derivation, final report rendering, and candidate
  final output generation.
- `synthesize-topic-workflow`: workflow validation/apply uses operation-specific
  preconditions and preserves structured apply failures/warnings.
- `topic-synthesis-structured-artifact`: artifacts add runtime-derived timeline
  markers and improvement dimension analysis while retaining compatibility
  handling.
- `topic-synthesis-detail-ui`: Topic Details renders marker-based timeline and
  improvement dimensions with legacy fallbacks.
- `host-bridge-cli-synthesis-subcommands`: CLI exposes the additional read-only
  synthesis queries and schema/CAS discovery needed by the skill runtime.
- `synthesis-concept-kb`: Concept KB exposes bounded read-only matching context
  for KG enrichment.
- `synthesis-citation-graph`: graph services expose topic-scoped cluster data
  suitable for deterministic statistics.

## Impact

- Affected areas: built-in create/update topic synthesis skill docs, output
  schemas, stage runtime/gate scripts, host bridge capability registry/CLI,
  workflow result validation, host apply, topic persistence materialization,
  sidecar ingestion, Topic Details adapter/rendering, and targeted contract
  tests.
- Expected database migration: none. Existing topic artifacts remain readable
  through compatibility fallbacks.
- Compatibility: legacy create bundles with `base_hashes` are accepted only
  when the topic is absent; the hashes are ignored with warning. Existing
  artifacts without `timeline_events.markers` or `improvement_dimensions` use
  UI fallback logic.
- Out of scope: wholesale redesign of final topic section schemas, bulk
  migration of existing topic artifacts, and direct agent authoring of external
  canonical reference indexes.
