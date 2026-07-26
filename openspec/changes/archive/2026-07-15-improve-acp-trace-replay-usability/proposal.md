## Why

ACP Trace & Replay now supports a repeatable capture-to-matrix workflow, but its fixed before/after phase selector, timestamp-only result names, sparse live feedback, and dense diagnostic layout make multi-stage governance difficult to operate and audit. The temporary developer tool should still make each replay's meaning obvious from both the UI and its artifacts.

## What Changes

- Replace the fixed Replay phase choices with a required user-entered governance stage that remains part of replay provenance and comparability.
- Derive a trace sample name from the selected trace filename and include sample and stage slugs in paired JSON/Markdown result filenames.
- Publish the current matrix slot before its profile window and present accurate current/completed progress without contaminating measurements.
- Add shared three-surface summaries and structured per-run detail to the controller view and Markdown report.
- Reorganize the unified Dashboard surface around progressive disclosure: concise identity, validation, progress, and results by default; limits, raw metadata, paths, and metric-family detail on demand.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `acp-runtime-replay-profiler`: Free-text governance stages, sample/stage artifact identity, live current-run progress, richer result summaries, and a progressively disclosed Dashboard workflow.

## Impact

The change affects Replay identity normalization, controller and matrix view contracts, result persistence and Markdown rendering, Dashboard actions/DOM/styles, localization, focused tests, and profiler/Dashboard/testing documentation. It does not change trace NDJSON, the fixed nine-run matrix, R2 workload, backend-free replay targets, source gates, or Workspace rendering invariants.
