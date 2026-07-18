## Why

The Synthesis Workbench still bypasses the client boundary for Reference Sidecar refresh and advanced reference matching maintenance commands, and three of those calls carry UI progress callbacks across the service boundary. These commands already persist operation progress consumed by the Workbench's 500 ms polling path, so a narrow Reference client capability can remove the coupling without changing user-visible progress or domain behavior.

## What Changes

- Add `SynthesisClient.references` with four bounded, no-argument maintenance commands for Reference Sidecar refresh/retry and advanced reference matching run/retry.
- Normalize command results to opaque JSON-safe objects and preserve stable in-process client error behavior.
- Route the four production Workbench command call sites through the lazily resolved default client.
- Stop carrying UI progress callbacks, streaming hooks, or Workbench DTOs through Reference maintenance contracts; existing `workbench.readProgress()` polling remains the progress source.
- Preserve confirmation, command single-flight, deferred-start differences, error presentation, and Index/Review/Graph invalidation.
- Keep Reference review and canonical mutations, queries, service methods, Host Bridge, MCP, persistence, and algorithms unchanged.

## Capabilities

### New Capabilities

- `synthesis-workbench-reference-maintenance-client-consumer`: Defines the narrow Reference maintenance command capability, callback-free Workbench consumption, adapter normalization, and migration boundaries.

### Modified Capabilities

None.

## Impact

- Synthesis contracts, in-process client adapter, and default legacy composition.
- Synthesis Workbench Reference maintenance command routing and focused tests.
- Service-boundary and Synthesis invariant checks while retaining 125 public service methods and four direct legacy consumers.
- Current-state Synthesis README, runtime/rebuild, Workbench host, and Workbench UI documentation.
