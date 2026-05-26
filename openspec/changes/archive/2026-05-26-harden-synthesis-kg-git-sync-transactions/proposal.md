## Why

Git Sync now has an adapter-bound v1, but review found that imports can bypass the canonical transaction boundary and that lock, debounce, and conflict UI behavior are not strong enough for safe synchronization. This change hardens Git Sync before any production adapter is introduced.

## What Changes

- Add a raw canonical envelope batch transaction helper for already-validated canonical assets.
- Route Git Sync imports through that helper so receipts/events include every imported canonical asset.
- Replace instance-only sync locking with persistent lock-file coordination and stale lock takeover.
- Add debounced store-change consumption with a single worker.
- Carry conflict affected asset details into the UI snapshot and render them in the Workbench Sync panel.
- Do not add a real Git CLI/remote adapter, credential UI, multi-remote/branch support, semantic merge, SQLite sync, or Zotero mirror recovery changes.

## Capabilities

### New Capabilities

- `synthesis-git-sync`: Harden Git Sync transaction, lock, debounce, and conflict UI requirements while the base Git Sync capability is still an active unarchived change.

### Modified Capabilities

- `synthesis-layer-foundation`: Foundation provides failure-safe raw canonical batch transaction behavior for validated envelope assets.
- `synthesis-workbench-ui`: Workbench renders Git Sync conflict affected assets and sync action state without leaking sensitive data.

## Impact

- Affects Foundation transaction helpers, Git Sync internals, Synthesis UI model/app, and focused core tests.
- Adds no npm dependency and no production Git adapter.
- Preserves existing Synthesis service facade and Zotero mirror recovery behavior.
