# Add Synthesis Sync Recovery

## Why

Synthesis Layer assets may be used across machines through a sync folder and
Zotero note-shard mirrors. The plugin needs deterministic diagnostics and
recovery decisions so mirror damage, missing roots, local index corruption, and
conflict candidates are explainable and do not overwrite canonical assets
without user confirmation.

## What Changes

- Add sync/mirror assessment helpers for canonical state, mirror manifests,
  decoded shard payloads, local indexes, startup checks, and recovery actions.
- Add disaster-recovery planning from note shards when the canonical root is
  missing.
- Add divergent canonical version planning that preserves local conflict copies
  instead of auto-merging or auto-overwriting.
- Add conflict candidate list normalization, sorting, and clear/retry action
  modeling.
- Extend Synthesis UI snapshot state with sync diagnostics and conflict
  candidate summaries.

## Out of Scope

- Actual Zotero note creation/deletion recovery operations.
- A full interactive conflict-resolution UI.
- Automatic Markdown merge.
- Automatically running agent update workflows.
- Using note shards to overwrite canonical assets without explicit user
  confirmation.

## Capabilities

### New Capabilities

- `synthesis-sync-recovery`: Deterministic diagnostics and recovery planning
  for Synthesis Layer sync/mirror state.

### Modified Capabilities

- `synthesis-tab-ui`: Snapshot can display degraded sync state and local
  conflict candidate summaries.

## Impact

- Adds pure recovery helpers under `src/modules/synthesis/`.
- Extends UI model DTO fields without changing web panel direct host access.
- Adds core tests for missing root, stale mirror, index rebuild, startup-check
  preference gate, and conflict candidate behavior.
