## Why

The Synthesis Workbench still bypasses the client boundary for Citation Graph layout and cache commands, and those command calls carry UI progress callbacks across the service boundary even though the Workbench already polls persisted operation progress every 500 ms. A narrow Graph command capability is required to complete this command-plane slice without coupling client contracts to UI callback or streaming semantics.

## What Changes

- Add `SynthesisClient.graph` with four bounded Citation Graph commands for layout recomputation, full cache rebuild, incremental cache refresh, and failed rebuild retry.
- Validate the layout algorithm and optional force flag at the in-process adapter boundary, normalize command results to opaque JSON-safe objects, and preserve stable client error codes.
- Route the five Workbench Citation Graph command call sites through the lazily resolved default client while preserving confirmation, single-flight, deferred start, polling, error handling, invalidation, and stale/missing/failed action behavior.
- Stop carrying progress callbacks, streaming hooks, or Workbench DTOs through Graph command contracts; existing 500 ms `workbench.readProgress()` polling remains the progress source.
- Keep Graph queries, metrics refresh, other Workbench command domains, service methods, Host Bridge, MCP, persistence, and algorithms unchanged.

## Capabilities

### New Capabilities

- `synthesis-workbench-graph-command-client-consumer`: Defines the narrow Graph command client capability, adapter validation and normalization, callback-free Workbench consumption, and migration boundaries.

### Modified Capabilities

None.

## Impact

- Synthesis contracts, in-process client adapter, and default legacy composition.
- Synthesis Workbench Citation Graph command routing and focused command tests.
- Service-boundary and Synthesis invariant checks while retaining 125 public service methods and four direct legacy consumers.
- Current-state Synthesis README, runtime/rebuild, Workbench host, and Workbench UI documentation.
