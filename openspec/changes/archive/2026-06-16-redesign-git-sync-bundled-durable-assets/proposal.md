# Redesign Git Sync Bundled Durable Assets

## Why

Git Sync currently exports durable Synthesis state as many small JSON assets and still allowlists projection roots such as `citation-graph`. In real repositories this can exceed import count limits and waste disk space because Git and NTFS amplify many small files. Projection state is also rebuildable and should not participate in cross-device durable exchange.

## What Changes

- Export Git Sync durable state as deterministic JSON bundles instead of one file per entity.
- Keep per-entity hashes inside the manifest so conflict detection remains entity-granular.
- Remove rebuildable projection/cache roots from the Git Sync allowlist.
- Treat v1 per-entity snapshots as import-only legacy input; the next export writes bundle v2.
- Improve import limit diagnostics with bundle and entry counts.
- Update documentation and specs to make the bundle layout the durable-state contract.

## Non-Goals

- Do not increase import limits as the primary fix.
- Do not sync live SQLite, operation rows, cache basis, citation graph cache rows, graph layout, or metrics.
- Do not introduce compression or archive dependencies in v1.
- Do not implement field-level merge or last-writer-wins.

## Impact

Git Sync repos become smaller, easier to push/pull, and less likely to fail on file-count limits while preserving reviewability, deterministic hashes, migration gates, and entity-level conflict approval.
