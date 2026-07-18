## Context

Production WebDAV orchestration currently combines remote layout, mutable HEAD handling, durable import/export, runtime JSON state, progress, retry timers, and conflict actions in `src/modules/synthesis/webDavSync.ts`. Preferences, encrypted credentials, URL construction, and HTTP execution are already isolated behind the strict `SynthesisHostWebDavSyncPort`. The sidecar now has a complete private durable application, so copying the plugin service would create a second policy owner exactly where WS5 needs one shared application boundary.

## Goals / Non-Goals

**Goals:**

- Make remote snapshot orchestration environment-neutral and reusable by private sidecar and production compositions.
- Preserve deterministic remote paths and bytes, preview-first import, HEAD-last publication, ETag conflict behavior, bounded retry, cancellation, progress, and public production results.
- Persist only secret-free application state through an injected store and drain WebDAV work before the durable application closes.
- Keep unbased-update acknowledgement an explicit composition policy.

**Non-Goals:**

- Public sidecar routes, credentials or preferences in Node, production persistence cutover, tombstone deletion, Host port wire changes, sync-index redesign, or release prebuild publication.

## Decisions

### 1. One shared application owns the WebDAV state machine

`createSynthesisWebDavSyncApplication` owns remote HEAD discovery, lazy source reads, durable preview/apply, local export, stable upload, state transitions, conflict reports, retry chains, pause/resume, admission stop, and drain. It depends only on strict ports. Keeping a second private implementation was rejected because remote ordering and failure classification would drift.

### 2. Durable and persistence behavior cross narrow ports

The application consumes a durable port with `previewImport`, `applyImport`, `discardImport`, and `buildExport`, plus a state store with load/save. The private adapter delegates directly to the existing durable application. The production adapter bridges existing root-based durable functions and current runtime files, retaining their paths, progress phases, and valid results. Generic filesystem helpers do not enter the shared package.

### 3. Remote sources are lazy and publication is HEAD-last

An existing snapshot becomes a `SynthesisDurableBundleSource` whose manifest and declared assets are read beneath `snapshots/<snapshot-id>/`. Export assets are uploaded in stable bundle order, followed by `manifest.json`; `HEAD.json` is written last with the observed ETag. A failed upload may leave an immutable orphan snapshot, but it cannot become visible as the current export.

### 4. State is strict, secret-free, and non-authoritative

Pointer, state, conflict, progress, and diagnostic DTOs are rebuilt centrally. Production retains `runtime/synthesis/webdav-sync/**`; the Node adapter uses an identity-bound shadow WebDAV directory and atomic text replacement. State may be recreated from Host description and durable facts, so it receives no cross-storage journal or repository table. Persisted retry metadata never restores a timer.

### 5. Unbased updates remain a composition policy

The application defaults to requiring explicit acknowledgement and blocks an unbased update without it. The production facade injects its current legacy acknowledgement policy to avoid changing existing `syncWebDavNow` behavior. The private disabled composition injects no acknowledgement. Silent last-writer-wins is not added to the future public sidecar boundary.

### 6. Lifecycle is layered

WebDAV has one active run. Stop cancels debounce/retry callbacks and rejects new triggers; shutdown waits for the active run. Service shutdown stops WebDAV before the durable application, then closes canonical and SQLite owners. The private sidecar uses a disabled Host port and registers no authenticated route or automatic trigger.

## Risks / Trade-offs

- [Production and private compositions use different unbased policy] → Make the policy explicit and cover both branches; remove the legacy policy only in a separately approved cutover.
- [A snapshot can be partially uploaded] → Keep snapshots immutable and publish HEAD only after all declared content succeeds.
- [Retry callbacks can outlive composition] → Bind every chain to a generation and cancel on pause, disablement, conflict, terminal failure, abort, superseding trigger, stop, and shutdown.
- [State corruption could trigger unexpected remote work] → Rebuild strictly and fail closed before Host I/O.
- [Production delegation can drift DTOs or progress] → Retain the compatibility facade and lock established Core 158/159/184 fixtures.

## Migration Plan

1. Add Core 216 contract/application fixtures and shared contracts.
2. Implement the shared application and private in-memory/Node adapters.
3. Replace production orchestration with compatibility adapters while retaining file layout and public exports.
4. Compose the disabled private owner after recovery, update inventories/docs, and run strict validation.
5. Rollback restores the production facade implementation and removes private composition; no production data migration is required.

## Open Questions

None. Public sidecar invocation and strict production unbased confirmation remain WS7 decisions.
