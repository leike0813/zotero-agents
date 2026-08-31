## Why

`literature-analysis` now emits a structured `literature_score.v1` artifact and
supports an internal `score_only` execution mode. The plugin still treats the
old digest, references, and citation-analysis notes as a terminal result, so it
cannot backfill scores for previously analyzed papers or display scores in the
library and Synthesis Index.

## What Changes

- Add payload-aware generated-note readiness and route literature analysis as
  `full`, `score-only`, or `unavailable` without exposing `score_only` as a user
  option.
- Store the score as a generated Zotero note with an embedded payload PNG,
  readable summary, six-dimension table, and derived radar PNG.
- Carry the score through literature/research bundles and note import/export.
- Add a hidden-by-default Zotero library `Rating` column after `Artifacts` and
  the same five-star display to the Synthesis Index.
- Keep score state independent from the existing three-artifact coverage and
  Synthesis sidecar/public index contracts.

## Capabilities

### Modified Capabilities

- `literature-workbench-workflows`
- `literature-digest-artifact-contract`
- `workbench-embedded-payload-storage`
- `zotero-library-artifacts-column`
- `zotero-skills-visual-theme`
- `synthesis-workbench-ui`
- `synthesis-persistence-performance`
- `synthesis-workbench-surface-refresh`

## Impact

- Changes workflow selection planning, request construction, apply, generated
  note storage, bundle portability, Zotero item-tree columns, and Synthesis
  Index projection/rendering.
- Does not change the `literature-analysis` Skill package, Synthesis sidecar
  schema, MCP/Host Bridge reference-index DTOs, or existing three-artifact
  completeness semantics.
