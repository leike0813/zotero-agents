# Design: Git Sync Bundled Durable Assets

## Bundle Layout

The synced `synthesis/` root stores:

- `manifest.json`
- `bundles/concepts.json`
- `bundles/references.json`
- `bundles/topics/<topicId>.json`
- `bundles/topic-graph.json`
- `bundles/reviews.json`
- `bundles/discovery.json`
- `bundles/tags.json`
- `bundles/related-items.json`
- `bundles/tombstones.json`

Large bundles may be split deterministically with `.part-0001.json` suffixes. The first implementation uses plain deterministic JSON rather than compression.

## Bundle File

Each bundle file uses:

- `schema_id: "synthesis.durable_asset_bundle"`
- `schema_version: "2.0.0"`
- `bundle_kind`
- `entries[]`

Each entry remains the durable asset envelope with `schema_id`, `schema_version`, `entity_kind`, `entity_id`, `base_hash`, `content_hash`, `updated_at`, and `data`.

## Manifest

`manifest.json` uses manifest schema `2.0.0`. Its `assets[]` describes bundle files and includes path, bundle schema id/version, bundle hash, byte count, entry count, and an entity hash index. The entity index is the conflict and sync-index source of truth.

## Import

Import validates manifest hash, bundle path safety, bundle hash, bundle schema, entry hash, duplicate entity ids, entity schema, tombstones, and reference integrity before writing SQLite. Conflict checks compare base/local/remote by entity hash from the manifest entry index.

Legacy manifest schema `1.0.0` remains readable as v1 per-entity input. Export always writes bundle v2.

## Projection Exclusion

Git Sync never exports citation graph cache rows, graph layout, metrics, operation rows, cache basis, runtime logs, locks, credentials, or temp workspaces. After import, affected projections are marked stale and rebuilt explicitly.
