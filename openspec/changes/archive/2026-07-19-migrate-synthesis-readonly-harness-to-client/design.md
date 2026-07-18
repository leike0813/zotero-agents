## Context

The migration-time `SynthesisClient` already routes lifecycle and workflow capabilities to the current in-process service, but `src/modules/harness/synthesisReadonlyService.ts` creates a second service composition and the UI harness calls four service methods directly. The four calls are pure, region-scoped Workbench reads and match the Stage 1 `workbench.*.read` boundary. The current service remains the production implementation and owner of the database, canonical Topic files, mirrors, and Zotero effects.

## Goals / Non-Goals

**Goals:**

- Add a narrow Workbench read group to `SynthesisClient` for chrome, surface, Topic detail, and paper digest queries.
- Make requests and results environment-neutral and JSON-safe without moving the plugin UI model into contracts.
- Reuse one legacy-service composition and method mapping for default and read-only clients.
- Preserve region-scoped reads, read-only harness behavior, resource cleanup, and stable client errors.
- Reduce the direct legacy service consumer allowlist from five entries to four.

**Non-Goals:**

- Migrate the production Workbench, Host Bridge, or MCP.
- Add a remote transport, Node sidecar process, retries, or service lifecycle changes.
- Change Synthesis query business rules, UI behavior, database schema, persisted files, or ownership.
- Add `getSynthesisSnapshot` to the client or define the final production Workbench wire schema.

## Decisions

### 1. Add one four-method Workbench client group

`SynthesisClient.workbench` exposes `readChrome`, `readSurface`, `readTopicDetail`, and `readPaperDigest`. These map to the existing service methods and use explicit request envelopes. Topic detail and digest results declare stable core fields while retaining JSON extension fields; chrome and surface results use named JSON-object projection types.

Alternative: add methods to `topics` and `artifacts`. Rejected because these reads are UI projections with the Stage 1 capability identities `workbench.topic_detail.read` and `workbench.paper_digest.read`, not general domain queries.

### 2. Contracts own the surface union, not the complete UI model

The eight Workbench surface names move to the environment-neutral contracts package. The plugin `uiModel` imports and re-exports that type. UI selection/filter state and snapshot projections cross this interim boundary as validated JSON objects.

Alternative: move `SynthesisUiState` and `SynthesisUiSnapshotInput` into contracts. Rejected because that would make renderer projection internals part of the sidecar protocol before production Workbench requirements are known.

### 3. One legacy composition resolves both default and read-only services

`legacyComposition.ts` is the sole module allowed to import `synthesis/service`. It contains one method adapter over a service resolver. The default client supplies `getDefaultSynthesisService`; the read-only harness supplies a service created with read-only repository and Zotero adapters. `defaultClient.ts` retains singleton and invalidation ownership.

Alternative: let the harness keep creating a service and wrap it locally. Rejected because it would preserve duplicate composition and the direct-consumer violation.

### 4. The read-only harness owns adapter lifetime

The renamed harness factory returns `{ client, close }`. It closes both adapters on normal shutdown and also cleans up partially initialized resources if composition fails. The client has no close method because resource lifetime belongs to the Node harness, not the transport contract.

### 5. Preserve legacy wire behavior at the adapter edge

The in-process adapter validates JSON-safe Workbench requests, maps camel-case client fields to the existing service input shape, serializes legacy results into JSON-safe objects, and applies the existing stable error normalization. It does not retry reads or reinterpret service status values.

## Risks / Trade-offs

- **Chrome/surface projections remain broadly typed** → Keep named JSON projection types and tighten them only with the production Workbench migration, based on real transport needs.
- **Moving composition can change default invalidation behavior** → Keep the singleton and invalidator in `defaultClient.ts` and test that only service resolution moves.
- **Legacy results contain optional `undefined` fields** → Preserve the existing serialization-based response normalization, which removes non-JSON values before returning them.
- **A caller could regress to the full snapshot** → Add static and behavioral guards that only the four declared methods are used and `getSynthesisSnapshot` is absent.

## Migration Plan

1. Add failing grouped-client, JSON boundary, composition, and read-only harness tests.
2. Add Workbench contracts and route them through the in-process adapter.
3. Extract the shared legacy composition and preserve default invalidation.
4. Rename and migrate the read-only harness and UI harness server.
5. Update the direct-consumer inventory and current-state documentation.
6. Run focused tests, invariant/boundary checks, typechecks, lint/format checks, build, and strict OpenSpec validation.

Rollback restores the prior harness composition and removes the new client group. No production data migration or ownership switch occurs.

## Open Questions

None.
