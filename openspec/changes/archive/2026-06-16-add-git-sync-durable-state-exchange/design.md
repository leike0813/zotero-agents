# Design: Git Sync Durable State Exchange

## Boundary

Git Sync exports canonical durable assets, not live runtime files. SQLite remains the local materialized store used by Workbench and services. Import writes SQLite only after validation, migration, dry-run, and conflict checks pass.

## Git Repository Layout

The `synthesis/` exchange root contains:

- `manifest.json`
- `topics/<topicId>/current/**`
- `concepts/<conceptId>.json`
- `concept-senses/<senseId>.json`
- `concept-aliases/<aliasId>.json`
- `concept-relations/<relationId>.json`
- `concept-reviews/<reviewId>.json`
- `topic-concept-links/<topicId>.json`
- `topic-graph/nodes/<topicId>.json`
- `topic-graph/edges/<edgeId>.json`
- `topic-graph/reviews/<reviewId>.json`
- `references/canonicals/<canonicalId>.json`
- `references/redirects/<fromCanonicalId>.json`
- `references/bindings/<bindingId>.json`
- `references/proposals/<proposalId>.json`
- `reviews/<reviewItemId>.json`
- `discovery/<topicId>/<hintId>.json`
- `tags/vocabulary.json`
- `tags/aliases.json`
- `tags/abbrev.json`
- `tags/protocol.json`
- `related-items/effects/<effectId>.json`
- `tombstones/<entityKind>/<entityId>.json`

## Asset Envelope

Every durable JSON asset uses:

- `schema_id`
- `schema_version`
- `entity_kind`
- `entity_id`
- `base_hash`
- `content_hash`
- `updated_at`
- `data`

JSON output is deterministic: stable paths, stable field order, stable sorting, and stable hashes.

## Manifest

`manifest.json` records:

- `manifest_schema_version`
- `producer_version`
- `min_reader_version`
- `required_capabilities`
- `domain_versions`
- `assets[]` with path, entity id, schema id/version, hash, and bytes
- `manifest_hash`

The manifest is validated before any import writes. Unknown future schema or missing required capabilities reject the import and prompt upgrade.

## Local Sync Index

The local-only sync index stays outside Git. It records `entity_id`, `last_synced_hash`, `last_exported_hash`, `last_imported_hash`, and `last_run_id`. Conflict checks compare:

- base = `last_synced_hash`
- local = current SQLite/topic export hash
- remote = Git asset hash

## Conflict Gate

Automatically allowed:

- local unchanged and remote changed: import remote
- local changed and remote unchanged: keep local and export
- local hash equals remote hash: no-op
- different entities changed: merge by applying independent assets

Blocked:

- same entity changed locally and remotely
- update vs tombstone
- rejected/open review divergence
- discovery rejected/open divergence
- reference binding or redirect target divergence
- topic graph edge status divergence

Blocked imports do not write SQLite. Git Sync enters `blocked_conflict`, writes a conflict report, and exposes resolution actions: `keep_local`, `use_remote`, `save_remote_copy`, `mark_needs_attention`, and `clear_after_manual_edit`.

## Migration

SQLite schema migration and Git asset schema migration are separate. Per-domain migrators convert known old asset schema versions into the current import DTO; they do not write SQLite. Unknown future schema versions reject import. Breaking durable asset changes must create a new asset schema version rather than redefining old semantics.
