# Design

## MCP Export

The public artifact export tool is renamed to
`synthesis.export_filtered_paper_artifacts`. The old
`synthesis.export_paper_artifact_bundle` tool is removed from `tools/list` and
from the protocol registry.

The new tool writes:

- `runtime/payloads/paper-artifacts-manifest.json`
- `runtime/payloads/artifacts/<safe-paper-ref>/digest.md`
- `runtime/payloads/artifacts/<safe-paper-ref>/references.json`
- `runtime/payloads/artifacts/<safe-paper-ref>/citation-analysis.md`

The manifest is the only JSON receipt for Stage 4 artifact export. It contains
status, provenance, `payload_hash`, `content_file`, `content_hash`, and
diagnostics. It never contains artifact bodies, `decoded_text`, raw note HTML,
raw references internals, or full payload objects.

## Filtering

Digest export keeps the first four top-level `##` sections, then demotes
headings by two levels so `##` becomes `####` and `###` becomes `#####`.

References export writes compact JSON rows with only `id`, `year`, `authors`,
and `title`.

Citation-analysis export reads `citation_analysis.report_md` or top-level
`report_md`, removes the highest-level `##` wrapper heading, demotes the
remaining headings by one level, and removes the last report section by
position when at least two same-level report sections remain. The removed
section heading is recorded for diagnostics only; title matching is not part of
the removal decision.

## Runtime State

SQLite remains the run-local state store for metadata, stages, action receipts,
resolver metadata, paper workset refs, artifact manifest rows, paper-analysis
metadata, and artifact registry. SQLite no longer stores artifact bodies,
cross-paper synthesis bodies, external literature analysis bodies, or final
section JSON bodies.

`paper_workset` remains as an internal worklist. It is automatically derived
from resolver results instead of being authored by the agent.

## Skill Flow

The LLM agent owns semantic authoring: topic intent, resolver design,
per-paper analysis, cross-paper synthesis, external literature analysis, and
final section JSON. Scripts own gate decisions, file/hash validation, manifest
validation, cross-paper context concatenation, final schema validation, result
bundle generation, and artifact registry registration.

The agent writes final section JSON files under `result/sections/`. A new
`validate_final_artifacts` action validates those files and generates
`result/topic-analysis.json` or `result/topic-analysis.patch.json`,
`result/preview.md`, `result/export.md`, and `result/result.json`.

The old DB-backed long-body `persist_cross_paper_synthesis` and render path are
removed from the recommended gate flow.
