## Why

Citation Graph layout still runs a synchronous CPU-heavy kernel inside the Synthesis application service and library write lock. The current persistence path also treats an unconditional upsert return as a basis guard, so an asynchronous or future cross-process computation could promote coordinates for a superseded graph.

## What Changes

- Add a bounded, environment-neutral Citation Graph layout engine package with strict JSON-safe compute request/result contracts.
- Move the force, radial, and components kernels out of the application module while preserving their exact version, parameters, coordinates, and layout hash.
- Compute outside the library write lock, then reacquire a short lock and promote only when the current graph hash still matches the compute basis.
- Add a test-only Node worker canary proving the engine contract survives structured-clone/JSON transport without adding a production worker runtime.
- Preserve the Graph client, Workbench, Host Bridge/MCP, database schema, persisted layout shape, and complete service inventory.

## Capabilities

### New Capabilities

- `synthesis-citation-graph-layout-engine`: Defines the bounded compute DTOs, deterministic layout kernels, environment-neutral dependency boundary, in-process engine, and process-readiness canary.

### Modified Capabilities

- `synthesis-citation-graph`: Requires layout computation outside the library write lock, graph-hash-guarded promotion, and stable failure/supersede behavior that preserves the previous projection.

## Impact

- Affects the Citation Graph layout module, application orchestration, legacy composition, repository promotion assumptions, focused Core tests, package checks, and current-state Synthesis documentation.
- Keeps `125 methods / 1 direct consumer`, adds no dependency, and does not activate a production worker, sidecar process, new public API, database migration, algorithm change, or layout-version bump.
