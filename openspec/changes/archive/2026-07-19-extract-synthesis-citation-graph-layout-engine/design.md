## Context

The Workbench layout operation reads the DB-backed Citation Graph and synchronously runs `computeCitationGraphLayout` while holding the per-library write lock. Force layout performs a fixed 700-tick simulation. The current post-compute path writes through an unconditional repository upsert and tests its returned row as if it were a compare-and-promote guard, so a graph change during an asynchronous computation can be overwritten by stale coordinates.

The kernels are otherwise deterministic TypeScript, but they share a module with application graph behavior and import hashing from an environment-coupled foundation module. The first process-readiness slice must isolate the pure compute boundary without changing production topology or layout output.

## Goals / Non-Goals

**Goals:**

- Extract a strict, bounded, environment-neutral layout engine with unchanged force, radial, and components output.
- Move CPU computation outside the library write lock and guard promotion with the graph hash used to compute the result.
- Preserve the existing persisted layout shape, hash semantics, operation progress, public clients, and UI behavior.
- Prove the compute DTO and engine are usable from a separate Node worker in tests.

**Non-Goals:**

- Production worker threads, worker pools, IPC, supervisors, or sidecar process ownership.
- Mid-compute wall-clock timeout enforcement, algorithm tuning, parameter changes, or a layout-version bump.
- Database schema, Host Bridge/MCP, SynthesisClient, Workbench, or service-inventory changes.

## Decisions

### Put the compute contract and kernels in `packages/synthesis-engine`

The package exports canonical request/result builders, shared node/edge limits, a `SynthesisCitationGraphLayoutEngine` interface, the deterministic kernels, and an in-process implementation. It may use the existing `d3-force` dependency but cannot import Node, DOM, Zotero, plugin, repository, filesystem, or application-runtime modules. This is a deeper boundary than moving functions to another application file and makes the package directly transportable later.

### Transport only the graph slice consumed by layout

Requests contain the canonical graph hash, normalized algorithm, sorted `{ nodeId, kind, title?, year?, initialX, initialY }` rows, and sorted `{ edgeId, source, target }` rows. Optional title/year preserve the current deterministic importance tie-break used by radial and components layouts. The application derives finite initial coordinates with the existing canonical SHA-256 helper so the engine neither imports nor duplicates hashing infrastructure. Results echo the graph hash and algorithm and return the existing layout engine/version/params with sorted finite coordinates. Canonical rebuilding rejects non-JSON data, duplicate identifiers, dangling endpoints, node-set mismatches, and inputs above 5,000 nodes or 20,000 edges; unknown JSON-safe fields are discarded.

Legacy layout presets are normalized by the application before the strict request is built. The engine does not compute graph or layout hashes. Application projection continues using the current canonical hashing implementation so persisted hashes remain byte-for-byte compatible.

### Keep application concerns outside the engine

An application adapter projects the DB `CitationGraph` to the compute DTO and the canonical result back to the existing `CitationGraphLayout`. The service owns cache readiness, operation progress, time-budget prechecks, diagnostics, locks, repository writes, and Workbench invalidation. `SynthesisServiceOptions` receives an injectable engine; default composition supplies the in-process implementation.

### Compute first, promote under a short lock

The service captures one immutable graph snapshot and awaits engine computation without holding the library write lock. It then reacquires the per-library lock, rereads the current DB graph hash, and writes only when that hash equals the request basis. A mismatch records `citation_graph_layout_basis_superseded`, leaves the prior layout row unchanged, and is not classified as engine failure. The old truthy-upsert guard is removed.

Engine throws, malformed results, and bounded-input failures produce stable diagnostics without raw error text and leave the prior layout projection readable. The existing pre-start time budget remains; the kernel exposes an implementation-only checkpoint hook outside serialized DTOs, while the default in-process engine does not enforce wall-clock cancellation.

### Use a test-only worker as the process canary

A Node-only fixture loads the engine in a worker, receives one canonical request through structured clone, and returns its canonical result. Direct and worker executions must match exactly. The fixture remains under tests and cannot be imported by plugin production code.

## Risks / Trade-offs

- [Floating-point output drifts during extraction] -> Characterize all three algorithms before migration and require representative coordinates plus layout hashes to remain unchanged.
- [Async computation widens the stale-basis race] -> Recheck the current graph hash inside the short promotion lock and never write on mismatch.
- [Bounds reject a graph that was previously attempted] -> Reuse the existing 5,000/20,000 hard limits and return a stable diagnostic while preserving the previous projection.
- [Node-only code leaks into the Zotero bundle] -> Keep worker code test-only and add static engine/application dependency guards.
- [Cooperative cancellation complicates a JSON contract] -> Keep checkpoints as an implementation option, not a request/result field, and defer timeout policy to a later runtime change.

## Migration Plan

1. Add failing contract, parity, race, failure, and worker-canary tests.
2. Add the engine package and move kernels without changing output.
3. Add application projection and inject the engine into the service composition.
4. Move computation outside the lock and replace the false upsert guard with graph-hash validation.
5. Update boundary documentation and run focused plus production validation.

Rollback is code-only because no persistent schema or public contract changes.

## Open Questions

None.
