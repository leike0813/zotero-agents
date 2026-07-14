## Context

The unified ACP Trace & Replay Dashboard already supports native trace selection, preflight, a fixed nine-run matrix, cancellation, retry, and per-record completion updates. Replay identity is still limited to a fixed `before-governance | after-governance` phase, result files contain only a timestamp, progress identifies only the last completed record, and the browser surface exposes configuration and raw diagnostics with little hierarchy.

This change builds on the implemented state of `unify-acp-trace-replay-workflow` without modifying that change. Trace event `owner.stageId` remains a workflow-owner identity and is not the governance stage for a replay artifact.

## Goals / Non-Goals

**Goals:**

- Let one trace be replayed under any required, human-readable governance stage.
- Make paired result artifacts identifiable from their filenames while preserving digest-based provenance.
- Show the current matrix slot accurately without publishing inside profile windows.
- Present concise default progress and results with detailed evidence available on demand.

**Non-Goals:**

- Changing semantic trace capture, NDJSON schema, trace filenames, or event owner `stageId`.
- Changing matrix order, warm-up/formal counts, R2 work, measurement families, cadence, or comparability rules beyond free-text phase values.
- Adding ETA, uploading artifacts, or exposing raw sensitive traces.
- Combining Recorder and Replay source switches or state machines.

## Decisions

### Keep `replayConfig.phase` as the governance-stage SSOT

The existing field remains in controller drafts, matrix JSON, comparability input, and start arguments, but its type becomes a normalized string. Values are NFKC-normalized, trimmed, internal whitespace is collapsed, controls are rejected, and the maximum is 80 Unicode characters. Run is unavailable for an invalid or empty value. Keeping the field avoids a matrix schema bump and preserves its existing provenance role; reusing event `stageId` is rejected because Chat traces lack it and Workflow traces may contain several.

### Derive sample identity from the selected path

A focused identity module derives the sample display name from the trace basename by removing `.partial`, `.ndjson`, and an optional `acp-trace-` prefix. No trace-header or Recorder input is added. The matrix stores this display alias for auditability, but digest remains the trace identity for comparison.

Filename segments use NFKC, lowercase Unicode letters/numbers, hyphen folding, and reserved `__` separation. Sample and stage slugs are bounded to 64 and 48 characters. Paired results use `acp-replay-{sampleSlug}__{stageSlug}__{safeTimestamp}-{nonce}` with one shared stem, `overwrite:false`, and existing paired cleanup. A monotonic nonce prevents same-millisecond collisions.

### Publish current-slot changes before measurement

The matrix runner adds an awaited `onRecordStart` callback before target preparation and any profile window. The controller stores `currentRun`, publishes the selected-surface refresh, and only then allows setup/drain/profiling to proceed. `onRecordComplete` remains after profiler finish and cleanup. Terminal and cancel paths clear `currentRun` in `finally`. A browser-local timer may display slot elapsed time without generating host snapshots; no ETA is inferred.

### Reuse one formal-result projection

The profiler owns a structured formal-run aggregation used by both Markdown and the controller view. It produces per-surface completion, formal record count, elapsed mean/range, events/s, and MiB/s while retaining per-record R1/R2/R3/drain/warning detail. The Dashboard does not independently recalculate domain metrics.

### Use progressive disclosure without changing source gates

The unified surface keeps Recorder and Replay as independent gated steps. Default content emphasizes identity, validation, required stage, cadence, the 3x3 matrix, inline errors, and three surface summaries. Recorder limits, raw trace metadata, paths, and per-run metric families use native expandable detail regions. Draft phase remains host-owned so Browse, preflight, retry, and selected-surface rebuilds do not lose it.

## Risks / Trade-offs

- [Progress UI contaminates profiles] -> Await `onRecordStart` and its Dashboard refresh before target preparation; retain record-complete publication after cleanup.
- [Trace rename changes the display sample] -> Treat sample name as descriptive only; digest remains provenance and comparison identity.
- [Free text creates unsafe filenames] -> Separate exact phase from bounded slug generation and reserve `__` solely as the field separator.
- [Snapshot replacement loses typed stage] -> Synchronize the host draft on change/blur and include it in Browse, preflight, and Run actions.
- [Richer UI duplicates report logic] -> Expose the profiler's shared formal summary and structured record fields instead of browser-side metric derivation.
- [Two active changes touch the same capability] -> Keep this delta additive and explicitly target the current implemented baseline; do not edit or archive the earlier change.

## Migration Plan

Existing trace files remain valid because sample identity comes from the selected path. Existing matrix v2 JSON remains loadable with optional sample metadata and its original fixed phase string. New outputs always contain sample and stage filenames plus the enriched report. Rollback requires no data migration.

## Open Questions

None.
