## Context

The plugin currently projects Workbench maintenance chrome directly from its complete repository and combines that operational state with plugin-only storage, WebDAV, review, and canonical-maintenance facts. The new sidecar repository contains only schema metadata, cache basis, and operations, so it can support a useful bounded read model without seeing production paths or acquiring mutation authority. Projection logic currently lives inside the large plugin service, where operation-to-job mapping and failure freshness are not reusable by the Node service.

## Goals / Non-Goals

**Goals:**

- Establish an environment-neutral application package above the repository package.
- Make one strict, bounded, side-effect-free operational chrome query reusable by plugin and sidecar composition.
- Exercise it through authenticated loopback HTTP and a strict internal client.
- Preserve current production Workbench behavior and the sidecar's isolation, lifecycle, and packaging guarantees.

**Non-Goals:**

- Routing production `SynthesisClient.workbench` or the Workbench host to the sidecar.
- Moving storage, WebDAV, review, canonical maintenance, Topic files, or additional repository table families.
- Adding operation submission/cancel/event APIs, UI, preferences, schema migrations, dependencies, or release prebuilds.

## Decisions

### Introduce an application package instead of extending repository responsibilities

`packages/synthesis-application` owns the operational Workbench query and imports only strict contract and repository types. Its read port exposes `getCacheBasis` and `listOperations`; SQL, Node, Zotero, filesystem, Host, and UI dependencies remain outside. The repository package remains persistence-only, and the package becomes the growth point for later WS5 use cases.

### Return a strict operational subprojection

The result contains `maintenance.cacheReadiness` and `maintenance.backgroundJobs`. Cache readiness contains exactly the Reference Sidecar and Citation Graph descriptors in fixed order, with missing represented explicitly. Jobs contain at most 50 running rows plus 20 current failures, sorted by update time and stable identity. Raw diagnostics, hashes, paths, repository identity, review counts, storage, sync, and canonical status are excluded.

The query maps determinate progress only when a positive total exists, clamps counts and percentage, and otherwise returns indeterminate progress. A failed operation is current when its related cache is absent or failed, or when the operation is newer than the cache's refreshed/updated time. Reads never reconcile or write operations.

### Reuse the projection without changing production routing

The plugin service adapts the shared jobs into its existing UI-compatible chrome/progress input and continues to compose all plugin-only fields. Its complete repository remains the read source. The sidecar runs the same query against its isolated store. No production composition imports the new sidecar Workbench client.

### Add a general authenticated canary capability

`workbench.chrome.read` is a general sidecar capability using the existing `SynthesisWorkbenchChromeReadRequest`; state is strictly rebuilt but does not affect operational status. The main process rebuilds the result before responding, and the internal client rebuilds request and result around the shared RPC transport. General wire limits remain 1 MiB and 50,000 JSON nodes. The query runs in the main process because it performs only two indexed cache lookups and bounded indexed operation reads; it does not use the compute worker queue.

### Keep transport failures domain-neutral

The shared RPC client accepts an error-code profile for canceled, timeout, invalid response, and unavailable transport outcomes. Workbench uses `request_canceled`, `request_timeout`, `response_invalid`, and `service_unavailable`; compute and transfer clients supply their existing worker-oriented mappings so their external behavior does not change.

### Preserve lifecycle, packaging, and governance boundaries

Discovery and handshake advertise the canary. Shutdown stops acceptance and closes the repository under the existing 500 ms budget. Runtime compilation, bundle inspection, fingerprinting, and boundaries include the application package and Workbench contract. The repository schema version, health snapshot, inventory, engine owners, and `mutationEnabled: false` remain unchanged.

## Risks / Trade-offs

- [A partial chrome capability could be mistaken for production-complete chrome] → Name and document the DTO as operational, exclude plugin-only fields, and prohibit production routing in static tests.
- [Synchronous SQLite queries could delay the control plane] → Use indexed fixed-key lookups, hard row limits, a 150 ms performance gate, and no scans or writes.
- [Shared projection refactoring could alter plugin UI behavior] → Run baseline parity through the existing production repository and preserve UI row shape and ordering.
- [Generic RPC error cleanup could regress compute clients] → Parameterize mappings and retain focused compute/transfer tests.
- [The application package could become an unbounded utility layer] → Permit only explicit use cases over narrow ports and enforce dependency-direction checks.

## Migration Plan

1. Add strict DTOs, tests, and the application package, then make the plugin reuse it with parity checks.
2. Add the authenticated sidecar handler and internal canary client without importing it into production composition.
3. Extend boundaries, packaging, fingerprints, inventory, and docs.
4. Ship source only; release automation regenerates runtime prebuilds later.

Rollback removes the canary, client, and application reuse while leaving the three-table repository and production plugin composition intact. No data migration or cleanup is required.

## Open Questions

None. Full production chrome routing, repository parity, and single-writer cutover require later changes.
