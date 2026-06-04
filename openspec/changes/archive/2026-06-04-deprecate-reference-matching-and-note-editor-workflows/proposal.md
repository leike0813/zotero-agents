# Deprecate Reference Matching And Note Editor Workflows

## Summary

Deprecate the old note-level `reference-matching` and `reference-note-editor` built-in workflows and archive their files under `deprecated/workflows_builtin`. Active built-in workflow loading, menus, settings, tests, and documentation should no longer expose these workflows.

References notes should also stop rendering a visible `Citekey` column. The `references-json` payload contract remains unchanged, so existing `citekey` fields may still be preserved for machine readers.

## Motivation

Reference resolution is now handled by Synthesis sidecar refresh, Advanced Reference Matching, and review workflows. Keeping the older note-level workflows active leaves duplicate semantics and stale citekey-oriented UI paths.

The visible references note should present bibliographic content without leaking old note-level citekey matching columns, while still preserving the payload shape produced by `literature-digest`.

## Scope

- Move the deprecated workflow implementations and their private citekey matching helpers to `deprecated/workflows_builtin`.
- Remove the workflows from active built-in manifests.
- Update active references table rendering to omit `Citekey`.
- Preserve `references-json` payload shape and `citekey` fields.
- Update active docs/specs/tests and guards.

## Non-Goals

- No migration of already-rendered notes.
- No change to `literature-digest` skill output.
- No change to Synthesis Advanced Reference Matching or sidecar matching.
