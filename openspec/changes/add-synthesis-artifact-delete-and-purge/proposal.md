# Change: Add Synthesis Artifact Delete And Purge

## Why

Synthesis Workbench can create and read topic synthesis artifacts, but it has no
artifact lifecycle controls. With free-form topics, users need a way to remove
obsolete or accidental topic artifacts without manually editing canonical assets.

## What Changes

- Add soft delete for topic synthesis artifacts.
- Add physical purge for already-deleted topic artifacts.
- Surface Delete and Purge Deleted controls in Synthesis Workbench.
- Keep canonical assets as the source of truth and refresh Zotero note shard
  mirrors after lifecycle changes.

## Impact

- Specs: `synthesis-tab-ui`, `synthesis-layer-integration`
- Code: synthesis service, UI model, Workbench host, Workbench frontend
- Tests: synthesis service integration and Workbench UI model/host tests
