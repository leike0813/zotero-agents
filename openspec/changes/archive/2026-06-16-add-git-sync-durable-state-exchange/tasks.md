# Tasks

## Contract

- [x] Define durable asset envelope, manifest, sync index, import preview, conflict report, and migration boundary types.
- [x] Add OpenSpec delta requirements for Git Sync, persistence, Workbench UI, and Synthesis docs.

## Export

- [x] Export durable SQLite facts through repository/domain APIs.
- [x] Export topic `current/` assets from the topic artifact root.
- [x] Produce deterministic JSON, stable paths, stable sorting, and stable hashes.
- [x] Exclude live SQLite, WAL/SHM, operation/cache/layout/runtime/log/lock/credential/temp files.

## Import

- [x] Validate durable manifest, paths, hashes, envelopes, duplicate entities, and schema before applying.
- [x] Run dry-run preview before repository writes.
- [x] Apply durable facts through repository/domain APIs.
- [x] Restore topic `current/` assets to the Synthesis artifact root.
- [x] Mark rebuildable projections stale after import.

## Conflict

- [x] Maintain local-only durable sync index.
- [x] Block same-entity local and remote edits.
- [x] Preserve Git Sync `blocked_conflict` status and conflict report behavior.

## Migration

- [x] Separate Git asset schema/version gate from SQLite schema migration.
- [x] Reject unsupported manifest/schema inputs before SQLite writes.

## UI and Status

- [x] Preserve Git Sync queue states: `idle`, `syncing`, `blocked_conflict`, `failed_retryable`, and `failed_permanent`.
- [x] Surface durable-state conflicts through existing conflict report/status plumbing.

## Docs

- [x] Add `doc/synthesis-layer/git-sync-durable-state.md`.
- [x] Link the durable-state doc from Synthesis layer README.
- [x] Update persistence/files, state machines, and sequences docs.

## Tests

- [x] Add durable export/import/recovery/conflict tests.
- [x] Run focused Git Sync tests.
- [x] Run TypeScript validation.
- [x] Run `openspec validate add-git-sync-durable-state-exchange --type change --strict`.
