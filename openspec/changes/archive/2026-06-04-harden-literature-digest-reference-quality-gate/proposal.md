## Why

Current `literature-digest` reference extraction can emit deterministic bad rows
such as bare DOI/URL titles, publication-metadata-only titles, and author-only
strings. Those rows are then persisted into generated references notes and the
Synthesis sidecar, forcing downstream dedupe and binding algorithms to clean up
errors that should have been blocked before materialization.

## What Changes

- Add a precision-first reference quality gate before `literature-digest` apply
  writes the generated references note.
- Keep the external `references-json` artifact shape as a bare references array;
  quality summaries are apply diagnostics, not payload wrapper fields.
- Add a Synthesis sidecar ingestion fallback that skips the same deterministic
  invalid rows for legacy/imported references artifacts.
- Document upgrade guidance for the external `literature-digest` skill Stage 4
  gate: hard-block obvious errors and soft-warn quality defects for LLM review.
- Update Synthesis docs and invariants so sidecar/canonical identity
  materialization is not treated as the primary reference extraction quality
  layer.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `literature-digest-artifact-contract`: references artifacts remain native
  arrays, but generated references notes are written after deterministic invalid
  references are filtered.
- `literature-workbench-package`: `literature-digest` apply gains a workflow-local
  quality gate and exposes structured apply diagnostics.
- `synthesis-reference-sidecar-citation-graph`: sidecar ingestion skips
  deterministic invalid raw references as a fallback.
- `synthesis-invariant-guardrails`: active Synthesis paths must not materialize
  deterministic invalid reference rows as canonical identities.
- `synthesis-layer-doc-system`: active docs must describe the skill/workflow/
  sidecar quality responsibility boundary.

## Impact

- Affects the builtin `literature-workbench-package` apply hook and tests.
- Affects Synthesis sidecar ingestion and reference sidecar tests.
- Adds no npm dependencies and no database tables.
- Does not directly modify the external `literature-digest` skill repository;
  this change only records upgrade guidance for that skill.
