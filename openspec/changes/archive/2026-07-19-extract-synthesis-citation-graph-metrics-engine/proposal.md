## Why

Citation Graph metrics still run PageRank, weak-component discovery, and role scoring synchronously inside the Synthesis application service and library write lock. This prevents the remaining CPU kernel from becoming process-portable and lets long computation block unrelated graph maintenance.

## What Changes

- Add a bounded, environment-neutral Citation Graph metrics engine with strict JSON-safe request/result contracts.
- Move metrics v2 PageRank, weak components, normalization, foundation/frontier scoring, and role hints out of the application graph module without changing outputs or hashes.
- Compute metrics outside the library write lock, then promote them only when the current graph hash still matches the compute basis.
- Share one capture/compute/promote path across full rebuild, incremental refresh, and manual refresh.
- Add a test-only Node worker canary without activating a production worker or sidecar runtime.
- Preserve graph clients, service methods, database schema, persisted metrics shape, WebDAV behavior, and service inventory.

## Capabilities

### New Capabilities

- `synthesis-citation-graph-metrics-engine`: Defines the strict compute DTOs, deterministic metrics v2 kernels, environment-neutral package boundary, in-process engine, and process-readiness canary.

### Modified Capabilities

- `synthesis-citation-graph`: Requires metrics computation outside the library write lock and graph-hash-guarded promotion that preserves previous metrics on superseded or failed computation.
- `synthesis-persistence-performance`: Requires graph structure readiness to remain independent from complex metrics computation and bounds the short capture/promotion lock sections.

## Impact

- Affects `packages/synthesis-engine`, Citation Graph application projection, service orchestration, legacy/readonly composition, focused Core tests, and current-state Synthesis documentation.
- Keeps `108 methods / 1 direct consumer`, adds no dependency, and does not change a public API, database schema, metrics version/formula, production topology, or durable-sync behavior.
