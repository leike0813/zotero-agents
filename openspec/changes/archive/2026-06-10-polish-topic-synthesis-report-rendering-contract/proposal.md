# Change: Polish Topic Synthesis Report Rendering Contract

## Why

The split topic synthesis runtime now produces a real structured
`result/sections/synthesis_report.json`, but the user-facing report experience
is still confused:

- `synthesis_report.body` contains runtime fallback paragraphs about artifacts,
  sections, sidecars, and Host persistence.
- The ACP workspace also contains `runtime/views/synthesis-report.md`, which is
  only a Stage 60 coverage preview but is named like the final report.
- Host `current/export.md` is rendered by dumping structured objects as JSON
  code blocks, which is hard to read and mismatched with the newer structured
  artifact contract.

The final report should be a human-readable synthesis, not an implementation
diagnostic or JSON envelope.

## What Changes

- Treat `result/sections/synthesis_report.json.body` as the canonical report
  prose produced by the split finalize runtime.
- Remove the redundant `runtime/views/synthesis-report.md` and manifest output
  from the split runtime.
- Remove internal fallback prose about artifacts, sections, sidecars, Host
  apply, and runtime contracts from generated report bodies.
- Render Topic Details report bodies as Markdown, while keeping the JSON section
  as the storage format.
- Keep `current/export.md` as a compatibility export, but render it as
  human-readable Markdown from structured sections instead of JSON source dumps.

## Impact

This change does not switch workflows, change Host apply semantics, or alter the
structured storage layout. It only clarifies which artifact is the report source
of truth and improves the user-facing rendering of that report.
