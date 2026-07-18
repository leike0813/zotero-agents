## Context

`SynthesisClient.workbench` already exposes the four narrow reads required by the production Workbench, and the read-only harness already consumes them. Production `synthesisWorkbenchTab.ts` still calls the complete legacy service for one chrome read, six surface reads, two Topic detail reads, and two digest reads. The UI also owns transport conversion that overlaps with the harness. Command execution, prewarm callbacks, progress polling, options, mutations, Host Bridge, and MCP remain outside the current client slice.

The migration must preserve the Workbench's region-level rendering model: surface request identity, latest-request and active-surface guards, dirty/loaded state, last-known-good snapshots, message structure, merge order, and transient SQLite busy handling. It must not add a full-snapshot route or change database, canonical file, mirror, or Zotero ownership.

## Goals / Non-Goals

**Goals:**

- Route all eleven production calls covered by the existing four Workbench read capabilities through the default `SynthesisClient`.
- Centralize UI state, projection, and digest conversion in one adapter shared by production and the read-only harness.
- Preserve region identity, stale-request rejection, last-known-good behavior, and existing user-visible results.
- Preserve SQLite busy as a stable transient `storage_busy` client error.
- Keep the direct legacy service consumer inventory exactly at the current four entries during the command-plane migration interval.

**Non-Goals:**

- Migrate prewarm phased callbacks, 500 ms background-job polling, commands, mutations, options, or `getTopicReport`.
- Migrate Host Bridge or MCP, add remote transport, or change process ownership.
- Add new Workbench query semantics or expose the legacy full snapshot.
- Change persisted store formats, Topic canonical files, mirrors, or Zotero ownership.

## Decisions

### 1. Reuse `SynthesisClient.workbench` directly

Production code resolves the default client lazily and invokes the existing grouped capability. No service-shaped facade is added, so the migration strengthens the intended capability boundary without reproducing the legacy service surface.

Alternative: add a Workbench-only compatibility facade. Rejected because it would create another API layer with the same eleven call sites and obscure which operations are genuinely client-backed.

### 2. Centralize transport conversion in one shared adapter

`workbenchUiAdapter.ts` owns conversion from `SynthesisUiState` to JSON-safe read state, opaque JSON projection to `SynthesisUiSnapshotInput`, and snake/camel digest payload to the UI contract DTO. Production Workbench and the read-only harness consume the same functions.

Alternative: leave conversions beside each consumer. Rejected because the two paths would continue to encode the same interim transport rules independently.

### 3. Preserve request and region ownership in the Workbench

Only service invocation and boundary conversion move. Existing request IDs, active-surface checks, merge ordering, dirty/loaded bookkeeping, last-known-good snapshots, and region message publication remain in their current owners. The client returns region-scoped projections and never a full snapshot.

Alternative: wrap the complete UI refresh lifecycle inside the client. Rejected because request arbitration and DOM-region ownership are UI concerns, not query transport semantics.

### 4. Normalize SQLite busy before generic client errors

`storage_busy` becomes a stable `SynthesisClientErrorCode`. The in-process adapter recognizes the existing SQLite busy shape before ordinary errors are normalized to `internal`. Workbench error publication can therefore retain `transient: true` and `code: "storage_busy"`.

Alternative: inspect SQLite implementation details at every UI call site. Rejected because stable error classification belongs at the client boundary and must be reusable by all consumers.

### 5. Keep the command plane on the legacy composition temporarily

The production Workbench remains a direct legacy consumer because its command, prewarm, polling, report, and mutation paths are intentionally excluded. The boundary test forbids the four migrated read methods from flowing back to the service while keeping the allowlist at legacy composition, Workbench, Host Bridge, and MCP.

Alternative: migrate all Workbench operations together. Rejected because callbacks, synchronous polling, and host effects need separate capability design and would expand this read-only change materially.

## Risks / Trade-offs

- **Mixed client/service composition remains in one Workbench module** → Static tests forbid regressions for the four migrated reads, and a follow-up change will design the command-plane capabilities.
- **Opaque projections can hide runtime shape drift** → Keep all conversion in the shared adapter and cover both production and harness routing with observable-behavior tests.
- **Error recognition can become SQLite-specific leakage** → Limit recognition to the in-process adapter and expose only the stable `storage_busy` code to consumers.
- **Lazy default-client resolution can change timing** → Resolve only at each migrated read boundary and retain existing request guards and UI update sequencing.

## Migration Plan

1. Add failing routing, boundary, adapter, error, and region-identity assertions.
2. Add the shared Workbench UI adapter and stable busy error mapping.
3. Migrate all eleven production read calls and reuse the adapter from the read-only harness.
4. Update current-state documentation and the migration inventory.
5. Run focused tests, boundary/invariant checks, typechecks, formatting/lint, build, and strict OpenSpec validation.

Rollback restores the eleven service reads and harness-local conversion while leaving persisted data untouched.

## Open Questions

None.
