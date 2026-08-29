## Why

Unified Citation Graph construction is split between the legacy paper-input builder and a separate production sidecar-to-cache builder embedded in the Synthesis application service. This duplicates graph semantics, keeps a large CPU/data-transformation kernel coupled to repository orchestration, and prevents consistent bounds, cancellation, and stale-basis protection.

## What Changes

- Add a bounded, environment-neutral Unified Citation Graph build engine with strict JSON-safe request/result contracts.
- Route both legacy paper-input graph projection and production full, incremental, and related-items graph construction through one graph-build semantic core.
- Keep repository and Host reads, canonical redirect and binding resolution, timestamps, transactions, hashing ownership, and cache-basis persistence in the application layer.
- Capture durable graph-input basis under a short lock, compute outside the lock, and promote only when the durable basis is unchanged.
- Preserve graph nodes, edges, diagnostics, hashes, database rows, clients, service methods, and the `108 methods / 1 direct consumer` inventory.
- Add a test-only Node worker canary without activating a production worker or sidecar runtime.

## Capabilities

### New Capabilities

- `synthesis-citation-graph-build-engine`: Defines strict graph-build DTOs, deterministic graph assembly semantics, bounded execution, checkpoint cancellation, the in-process engine, and process-readiness canary.

### Modified Capabilities

- `synthesis-citation-graph`: Requires all graph construction paths to use the shared build engine and preserve last-good graph state on failed or superseded computation.
- `synthesis-reference-sidecar-citation-graph`: Requires production sidecar graph projection to capture and validate a durable input basis around lock-free engine computation.
- `synthesis-persistence-performance`: Requires bounded lock sections and bounded graph-build requests while keeping Host I/O and engine computation outside the library write lock.

## Impact

- Affects `packages/synthesis-engine`, Citation Graph application adapters, service orchestration, default/readonly composition, focused Core tests, and current-state Synthesis documentation.
- Adds no dependency and does not change a public API, database schema, durable-sync behavior, metrics/layout algorithms, production topology, or service inventory.
