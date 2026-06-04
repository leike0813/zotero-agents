# Tasks

## OpenSpec / Docs

- [x] Add proposal, design, tasks, and delta specs for workflow deprecation and references table rendering.
- [x] Update active specs/docs that described `reference-matching` or `reference-note-editor` as active built-ins.
- [x] Update references table column contract to omit visible `Citekey`.

## Workflow Packaging

- [x] Move deprecated workflow directories to `deprecated/workflows_builtin`.
- [x] Move private note-level citekey matching helpers out of active package files.
- [x] Remove deprecated workflow ids and files from active built-in manifests.

## Rendering

- [x] Update `renderReferencesTable()` to keep payload citekey data but omit the visible column.
- [x] Update active templates/debug note writers that hand-render references tables.

## Tests

- [x] Archive dedicated tests/fixtures for deprecated workflows.
- [x] Update loader/settings/domain tests to assert deprecated workflows are not active built-ins.
- [x] Add literature-digest coverage that payload citekey is preserved while the visible table omits it.
- [x] Run targeted tests, TypeScript, build, and OpenSpec validation.
