# Durable Bundle Sync

WebDAV Sync is the current user-visible manual cross-device exchange mechanism for durable Synthesis state. Git Sync is retained as a deprecated hidden transport for historical diagnostics and future cleanup, but it is no longer exposed in Preferences, Dashboard, or Synthesis Home.

SQLite is the local materialized store used by Workbench and domain services. The live SQLite file is never the sync payload. Sync transports exchange deterministic, reviewable, migratable durable-state assets that can hydrate a clean local SQLite store.

## Product Boundary

Git Sync covers long-lived Synthesis facts that cannot be fully rebuilt from Zotero Library and workflow artifacts:

| Domain | Durable State |
| --- | --- |
| Topics | `topics/<topicId>/current/**` assets and topic-concept links |
| Concepts | concepts, senses, aliases, relations, review rows |
| Topic graph | nodes, edges, relation review rows |
| References | canonical references, redirects, bindings, match proposals |
| Reviews | current review items and domain-local accepted/rejected decisions |
| Discovery | topic interest metadata and discovery hints |
| Tags | vocabulary, aliases, abbreviations, protocol |
| Related items | external side-effect provenance/effect rows |

Durable bundle sync does not cover `zotero-agents.db`, WAL/SHM files, `synt_operation`, `synt_cache_basis`, citation graph cache rows, graph layout, metrics, runtime logs, locks, credentials, or temporary workspaces.

## WebDAV Durable Bundle Sync

WebDAV Sync is the visible lightweight transport for the durable bundle contract. It is intended for users who want cross-device sync without Git worktrees, commits, and object history.

WebDAV Sync still does not synchronize the live SQLite database. SQLite remains a local materialized store. WebDAV only exchanges durable bundle snapshots:

| Remote path | Meaning |
| --- | --- |
| `HEAD.json` | Current snapshot pointer with snapshot id, manifest hash, producer version, and update time |
| `snapshots/<snapshotId>/manifest.json` | Durable bundle manifest |
| `snapshots/<snapshotId>/bundles/**` | Deterministic durable bundle files |

The sync flow downloads the remote HEAD and snapshot when present, validates the manifest and bundle hashes, runs durable preview, applies only when conflict-free, exports the current local durable facts, uploads bundles and manifest, and updates `HEAD.json` last. A missing `HEAD.json` is a normal initialization state. If `HEAD.json` changes during upload, WebDAV Sync stops rather than overwriting the remote pointer.

WebDAV v1 is manual by default. Automatic sync and automatic retry are preference-controlled and default off. v1 does not compress bundles, delete old remote snapshots, reuse Zotero file-sync credentials, or perform field-level merge.

## Configuration

Long-term WebDAV Sync configuration lives in Zotero Preferences, not Workbench. Preferences own:

- enabled flag;
- base URL;
- remote path;
- username;
- automatic retry flag;
- encrypted credential.

The Workbench Home Sync panel shows WebDAV runtime status and manual actions, but does not edit long-term configuration. It also contains a terminal-style feedback area for pending actions, diagnostics, connection test status, and last run status.

## Deprecated Git Sync

Git Sync code is retained but hidden from user-facing UI. Its prefs keys, service facade, token storage, command adapter, and tests may remain so existing runtime state can be diagnosed and future cleanup can be staged safely.

Git Sync no longer has a Preferences card, Dashboard entry, or Synthesis Home action. New visible sync UX should target WebDAV durable bundle sync unless a future change explicitly restores or replaces Git Sync.

## Repository Layout

The Git worktree stores Synthesis exchange assets under the synced `synthesis/` root:

| Path | Meaning |
| --- | --- |
| `manifest.json` | Durable-state manifest and capability/version gate |
| `bundles/concepts.json` | Concepts, senses, aliases, relations, and concept review rows |
| `bundles/references.json` | Canonical references, redirects, bindings, and match proposals |
| `bundles/topics/<topicId>.json` | Topic current source assets and topic-concept links |
| `bundles/topic-graph.json` | Topic graph nodes, edges, and graph review rows |
| `bundles/reviews.json` | Current review rows |
| `bundles/discovery.json` | Topic interest metadata and discovery hints |
| `bundles/tags.json` | Tag vocabulary, aliases, abbreviations, and protocol |
| `bundles/related-items.json` | Related-items side-effect provenance |
| `bundles/tombstones.json` | Durable deletes |
| `sync/sync-manifest.json` | Git adapter file-set manifest |

Large bundles may be split deterministically as `.part-0002.json`, `.part-0003.json`, and so on. Git Sync v2 uses plain deterministic JSON bundles rather than compression so the payload remains reviewable and plugin-runtime safe.

## Asset Envelope

Every durable bundle entry uses:

```json
{
  "schema_id": "synthesis.durable.<domain>",
  "schema_version": "1.0.0",
  "entity_kind": "reference_binding",
  "entity_id": "binding:example",
  "base_hash": "",
  "content_hash": "sha256:...",
  "updated_at": "2026-06-14T00:00:00.000Z",
  "data": {}
}
```

`content_hash` covers schema id/version, entity kind/id, and `data`. Export output must be deterministic: stable path, stable sorting, stable JSON field order, and stable hash.

Each bundle file uses:

```json
{
  "schema_id": "synthesis.durable_asset_bundle",
  "schema_version": "2.0.0",
  "bundle_kind": "references",
  "entries": []
}
```

## Manifest

`manifest.json` records:

- `manifest_schema_version`
- `producer_version`
- `min_reader_version`
- `required_capabilities`
- `domain_versions`
- `assets[]` with bundle path, bundle schema id/version, bundle hash, bytes, entry count, and per-entity hash index
- `manifest_hash`

Import validates the manifest before reading assets. Unknown future schema versions or missing capabilities reject import with an upgrade diagnostic.

The per-entity hash index preserves conflict detection even though Git stores fewer files. The local sync index records entity hashes from the manifest entry index, not whole-bundle hashes.

## Durable vs Projection

| Class | Git Durable Asset | SQLite Runtime State | Rebuild Policy |
| --- | --- | --- | --- |
| Reference bindings and redirects | yes | yes | preserved, not rebuilt away |
| Concepts and topic graph decisions | yes | yes | preserved |
| Reviews and discovery decisions | yes | yes | preserved |
| Topic `current/` assets | yes | file-backed | restored to topic artifact root |
| Citation graph rows | no | yes | stale after import, rebuilt explicitly |
| Graph layout and metrics | no | yes | stale after import, rebuilt explicitly |
| Operation progress | no | yes | local-only |
| Cache basis | no | yes | local-only freshness marker |

## Export Flow

1. Read durable SQLite facts through repository/domain services.
2. Read topic `current/` assets from the topic artifact root.
3. Build durable asset envelopes.
4. Group envelopes into deterministic bundles and chunks.
5. Write `manifest.json`.
6. Let the Git adapter commit and push.

Export never scans arbitrary runtime directories, never copies live SQLite, and never carries rebuildable projection roots such as `citation-graph`.

## Import Flow

1. Fetch/pull into the Git worktree.
2. Validate path safety, manifest hash, asset hash, envelopes, schema, duplicate entities, tombstones, and reference integrity.
3. Run per-domain migrators into current import DTOs.
4. Run dry-run preview and conflict gate.
5. If no blocking conflicts exist, write through repository/domain services and restore topic current assets.
6. Mark Index, Citation Graph, layout, metrics, Concept, and Tag projections stale.

Import does not write SQLite during validation or preview.

Import limits are enforced by bundle count, entry count, total byte count, and single-bundle byte count. Diagnostics include `bundle_count`, `entry_count`, `total_bytes`, `largest_bundle_bytes`, and `largest_bundle_path` where known. Legacy v1 per-entity snapshots remain readable for migration, but export always writes bundle v2.

## Conflict Gate

The local sync index is not committed to Git. It records `entity_id`, `last_synced_hash`, `last_exported_hash`, `last_imported_hash`, and `last_run_id`.

Conflict detection compares:

- base = `last_synced_hash`
- local = current local export hash
- remote = Git entity hash from the manifest entry index

Allowed automatically:

- local unchanged, remote changed: import remote
- local changed, remote unchanged: keep local and export
- local hash equals remote hash: no-op
- different entities changed: merge independent entities

Blocked:

- same entity changed locally and remotely
- update vs tombstone
- rejected/open review divergence
- discovery rejected/open divergence
- reference binding or redirect target divergence
- topic graph edge status divergence

When blocked, Git Sync enters `blocked_conflict`, writes a conflict report, and does not write SQLite. v1 does not perform field-level merge or last-writer-wins.

## User Resolution

Workbench may expose:

- `keep_local`
- `use_remote`
- `save_remote_copy`
- `mark_needs_attention`
- `clear_after_manual_edit`

These actions route through Git Sync conflict handling. The UI must not directly mutate SQLite to bypass the durable import/export contract.

v1 enables conservative actions by default:

- `keep_local` closes the conflict gate, keeps local SQLite/artifacts unchanged, and queues the next export.
- `save_remote_copy` copies remote conflict assets to local conflict-review storage and keeps the state blocked.
- `clear_after_manual_edit` reruns validation and durable preview, clearing the blocker only when the conflict is gone.
- `use_remote` and `mark_needs_attention` remain unavailable unless the service can prove a safe single-entity action.

## Migration and Compatibility

Each domain owns an asset schema version and migrator. Migrators convert known old durable assets into current import DTOs; they do not write SQLite.

SQLite schema migration is separate from Git asset schema migration. Future breaking changes must add a new asset schema version and keep old schema semantics stable. `min_reader_version` and `required_capabilities` prevent old plugins from misreading new repos.

## Recovery

If local SQLite is lost, a valid Git durable repo can hydrate durable facts into a clean local runtime root. Hydration restores durable facts and topic current assets, then marks rebuildable projections stale. The user can explicitly rebuild cache projections afterward.
