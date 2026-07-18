## Context

The shared durable bundle codec now produces deterministic v2 exports and strictly verifies valid v1/v2 sources. Production import still rebuilds local state by rereading the source after preview, casts entity data into repository upserts, writes Topic files and the sync index outside the SQLite transaction, and silently skips tombstones. The isolated sidecar has no import use case, strict sync metadata, auxiliary durable owners, or recovery protocol spanning SQLite and multiple canonical Topic currents.

## Goals / Non-Goals

**Goals:**

- Normalize all live durable payloads once, compare verified remote facts with a stable local/index capture, and pin a bounded apply candidate in a single-use receipt.
- Apply SQLite facts, Topic registry targets, projection invalidation, sync metadata, and a durable commit receipt under one expected-basis transaction.
- Stage all Topic currents before the SQLite commit and recover forward after the commit marker, including JSON and bounded Markdown current assets.
- Preserve production valid import and WebDAV behavior while sharing environment-neutral normalization, sync-index, and conflict facts.

**Non-Goals:**

- Tombstone deletion semantics, WebDAV transport, remote layout, retry/ETag/conflict UX, public service operations, Host effects, production persistence cutover, or release prebuilds.

## Decisions

### 1. Import normalization is a strict live-kind registry

One registry maps each live entity kind to its payload rebuilder, identity check, aggregate mutation granularity, and stable local key. Verification of the outer envelope is insufficient because `data` remains generic JSON. Tombstones are counted and diagnosed but never projected into a mutation until a later protocol defines their target identity. Keeping the production `as never` switch was rejected because it permits malformed facts and duplicates rules.

### 2. Preview pins one bounded receipt and apply never rereads the source

`previewImport` uses the existing environment-neutral source and codec, captures repository facts, Topic bases, and sync revision transactionally, computes base/local/remote classifications, and retains at most one cloned receipt. Validation errors, conflicts, and tombstones return no receipt. A receipt with updates that lack a synced base requires an explicit overwrite acknowledgement. Apply consumes the receipt before mutation and rejects manifest, receipt, or recaptured-basis mismatch. Re-previewing inside apply was rejected because it has a source and local-state TOCTOU window.

### 3. Sync metadata is strict, isolated, and transactionally advanced

The existing production sync-index field layout becomes a shared exact-field contract with derived collection bounds. The sidecar persists the same normalized entity facts in SQLite with a revision and last imported/synced hashes; production retains its file adapter and canonical bytes. The repository updates the index in the same transaction as imported facts, so an index write cannot lag a successful SQLite import.

### 4. Repository import is one expected-basis unit of work

The repository receives the normalized target mutations, expected aggregate basis and expected index revision. It rechecks both inside one transaction, applies only entities present in the source, preserves absent local entities, updates Topic registry hashes, marks rebuildable projections stale, advances sync metadata, and writes a bounded durable import commit receipt. Aggregate entities such as Tag vocabulary and per-Topic concept links replace only their registered aggregate. Generic import tables and calls through domain mutation applications were rejected because they would duplicate domain storage and side effects.

### 5. Missing durable owners are migrated into their domain families

Topic interest metadata, Topic discovery hints, and Related Items sync effects receive isolated repository schemas and strict row rebuilders. They participate in export capture and import but trigger no discovery cascade or Host effect. Treating them as permanently empty would make a verified production corpus lossy.

### 6. Canonical import uses stage, SQLite commit marker, then forward promotion

The canonical store stages and fsyncs a complete multi-Topic batch without changing current. The repository transaction then writes the import commit receipt, which is the cross-storage commit marker. Canonical promotion runs synchronously immediately afterward and records per-Topic progress. Before readiness, recovery discards staging when no matching repository receipt exists, or idempotently completes forward promotion when it does; mismatched identities or target bases enter `repair_required`. Rolling SQLite back after canonical writes was rejected because it requires duplicating the complete repository and fails under process interruption.

### 7. Markdown is part of the private complete-current model

The canonical snapshot gains bounded safe `.md` current assets and a full-current hash while preserving the existing public inspect DTO. Markdown participates in staging, CAS, journal recovery, export, and import. HTML, `.metadata.json`, `assets/` descendants, unknown JSON files, symlinks, traversal, and duplicate paths remain invalid. Rejecting all production Markdown imports was rejected because it would make the durable corpus incomplete.

### 8. Export and import share lifecycle admission

Build, verify, preview, apply, and discard remain on the existing private durable bundle application and share one active lease. Stop clears the receipt and shutdown drains before canonical and SQLite closure. No router or client surface is added.

## Risks / Trade-offs

- [A verified corpus can be large in memory] → Retain existing derived entity limits, four-MiB per bundle bounds, one receipt, and one active operation.
- [Crash after SQLite commit can expose partial canonical promotion on disk] → Block readiness, retain the staged batch and repository receipt, and complete forward before other service composition proceeds.
- [Unbased updates can overwrite local durable decisions] → Report them separately and require explicit acknowledgement bound to the receipt.
- [Markdown expands canonical state] → Allow only bounded `.md` current paths and keep public inspect payloads unchanged.
- [Production delegation can alter valid results] → Lock DTOs, canonical sync-index bytes, preview/apply fixtures, progress, WebDAV, and Host behavior in existing Core suites.

## Migration Plan

1. Add Core 215 contracts and compatibility fixtures, then shared import/index normalization.
2. Add auxiliary durable tables, transactional capture/apply, sync metadata, and commit receipt.
3. Extend canonical snapshots with Markdown and add batch stage/promotion/recovery.
4. Extend the private application and Node composition, then delegate production-compatible pure logic.
5. Update inventories, documentation, and strict validation. Rollback removes the private composition and isolated schema additions; no production data is migrated.

## Open Questions

None. Tombstone target/delete semantics and WebDAV transport remain explicit later changes.
