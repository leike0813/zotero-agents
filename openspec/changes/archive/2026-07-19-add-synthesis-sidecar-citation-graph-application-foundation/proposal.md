## Why

The Synthesis sidecar already owns an isolated repository, Topic application foundation, and reusable Citation Graph build, layout, and metrics engines, but it lacks a private application boundary that can assemble those pieces into a durable citation-graph projection. Establishing that boundary now provides a bounded, CAS-safe shadow application without changing production graph ownership or exposing another RPC capability.

## What Changes

- Add strict private Citation Graph application contracts for inspection, bounded slice/metrics/layout reads, full rebuild, explicit layout and metrics recomputation, admission stop, and shutdown.
- Consolidate Citation Graph rows, schema, persistence operations, and canonical hashing into shared repository/application sources of truth while keeping plugin adapters as compatibility re-exports with unchanged production results.
- Extend the isolated sidecar repository with versioned Citation Graph application state and durable structure, ownership, incoming, metrics, and layout projections.
- Compose a private Citation Graph application after repository recovery, using the existing bounded single-worker compute service, single-mutation admission, transactional compare-and-swap promotion, and last-good preservation semantics.
- Keep the new application disconnected from HTTP/RPC capabilities, `SynthesisClient`, automatic shadow execution, production graph persistence, and production worker routes.
- Extend integration, invariant, packaging, lifecycle, persistence, performance, and documentation coverage for the new private application foundation.

## Capabilities

### New Capabilities

- `synthesis-sidecar-citation-graph-application-foundation`: Defines the private bounded Citation Graph application, durable shadow projection, worker-backed mutation lifecycle, compare-and-swap promotion rules, failure semantics, and production-disconnected composition.

### Modified Capabilities

- `synthesis-application-foundation`: Owns environment-neutral Citation Graph orchestration, projection, and canonical hash helpers.
- `synthesis-sidecar-isolated-repository-foundation`: Adds the private graph application schema, transactional replacement, and bounded projection reads.
- `synthesis-sidecar-runtime-foundation`: Constructs the private graph application after repository recovery.
- `synthesis-sidecar-runtime-supervision`: Drains active graph compute before repository closure.
- `synthesis-sidecar-runtime-packaging`: Includes and fingerprints graph application artifacts and adapters.
- `synthesis-sidecar-service-boundary`: Preserves environment and worker/persistence dependency direction.
- `synthesis-invariant-guardrails`: Preserves public routing and production ownership inventories.
- `synthesis-persistence-performance`: Defines short graph transactions, worker-only kernels, and bounded reads/admission.
- `synthesis-layer-doc-system`: Records the private shadow application and deferred production cutover.

## Impact

The change affects shared Synthesis contracts and repository packages, the isolated sidecar repository and service composition, Citation Graph worker adapters, build and bundle inventories, static boundary and migration checks, focused Core tests, and Synthesis runtime/persistence/performance documentation. It adds no dependency, public protocol method, UI, preference, production database migration, or production routing change.
