## Why

Synthesis KG now has canonical domains for tags, topics, concepts, and literature/citation data, but synchronization is still limited to local store behavior and Zotero mirror recovery. Git Sync is the next roadmap phase because canonical assets need a durable exchange layer that does not sync projections, runtime state, logs, or credentials.

## What Changes

- Add a Git Sync capability for exporting and importing Synthesis KG canonical assets through an isolated sync worktree.
- Add a sync lock, single-worker queue, debounced canonical-store-changed consumption, run receipts, sanitized diagnostics, and conflict gate.
- Introduce an injectable Git adapter boundary so plugin runtime does not directly depend on Node-only Git execution.
- Add file-level conflict handling for v1 and block remote import when both sides modify the same canonical asset.
- Expose Git Sync status and actions through Synthesis service and Workbench UI state.
- Do not implement multi-remote or multi-branch sync, semantic merge, hosted sync service, credential storage UI, SQLite sync, or replacement of Zotero mirror recovery.

## Capabilities

### New Capabilities

- `synthesis-git-sync`: Git-backed canonical store export/import, queue, lock, conflict gate, adapter boundary, validation, receipts, and diagnostics.

### Modified Capabilities

- `synthesis-layer-foundation`: Foundation exposes canonical export/import support, sanitized validation boundaries, sync lock state, and projection stale marking used by Git Sync.
- `synthesis-sync-recovery`: Zotero mirror recovery remains separate from Git Sync and must not be treated as the Git remote synchronization path.
- `synthesis-workbench-ui`: Workbench exposes sync status, conflict state, queue state, and manual sync actions.

## Impact

- Affects Synthesis service internals, Foundation helper use, Workbench UI model/app, and focused core tests.
- Adds no npm dependency and no external MCP write surface.
- Uses existing runtime persistence and Foundation transaction helpers.
