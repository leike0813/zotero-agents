# Add Git Sync Durable State Exchange

## Why

Synthesis now stores long-lived facts in the local SQLite sidecar while topic body artifacts remain file-backed JSON/Markdown assets. A live SQLite file is not safe to synchronize across devices: WAL/SHM state, local locks, runtime operations, cache projections, and schema migration timing make file-level sync fragile and hard to review.

Git Sync should therefore be the first-class cross-device exchange mechanism for Synthesis durable state. Git provides a free, inspectable, append-only transport with user-visible history, while Synthesis owns the import/export contract that turns local SQLite rows and topic current assets into deterministic durable-state assets.

## What Changes

- Treat SQLite as a local materialized store, not the sync payload.
- Export durable Synthesis facts and topic `current/` assets into Git-managed JSON/Markdown assets.
- Add a root `manifest.json` with schema, version, capability, path, hash, and byte metadata.
- Import by validate/dry-run/conflict-gate first, then apply through repository/domain services.
- Maintain a local-only sync index for three-way conflict detection.
- Mark rebuildable projections stale after successful durable import.
- Document the durable exchange contract in `doc/synthesis-layer/git-sync-durable-state.md`.

## Non-Goals

- Do not sync `zotero-agents.db`, WAL/SHM files, runtime locks, logs, credentials, temp workspaces, or operation rows.
- Do not make Zotero note shards the primary sync mechanism in this change.
- Do not support v1 field-level semantic merge or last-writer-wins conflict resolution.
- Do not preserve the old Git Sync design as a compatibility constraint; current code may be reused only where it fits the new contract.

## Impact

Git Sync becomes the product boundary for Synthesis cross-device state exchange. Users can recover durable Synthesis facts from a Git repo after losing local SQLite, while cache/index/graph/layout/metric projections remain rebuildable local materializations.
