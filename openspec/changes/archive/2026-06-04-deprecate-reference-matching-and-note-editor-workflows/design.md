# Design

## Workflow Deprecation

`reference-matching` and `reference-note-editor` are archival workflows. Their implementation files are moved to `deprecated/workflows_builtin/literature-workbench-package/`, and active package manifests no longer reference their workflow ids or private helper files.

Stale persisted settings are not migrated. Since active loading no longer returns those workflow ids, settings UI and execution paths naturally ignore them.

## References Note Rendering

`runtime.helpers.renderReferencesTable()` remains the canonical active HTML table renderer. It continues to normalize references through `normalizeReferencesArray()`, which preserves `citekey` when present, but the visible table omits the `Citekey` header and cell.

Active note writers that call the helper inherit the new table shape. Obsidian references projection templates also omit per-reference citekey display while keeping payload fields intact.

## Compatibility

Existing notes are not rewritten automatically. Regenerated or re-imported notes use the new visible table shape. Consumers that read `references-json` continue to see the original payload structure.
