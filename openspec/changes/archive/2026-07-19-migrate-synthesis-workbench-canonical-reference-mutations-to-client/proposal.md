## Why

The Synthesis Workbench still bypasses the client boundary for canonical Reference merge, metadata update, and archive commands. These four mutation paths form the last Reference command slice outside `SynthesisClient.references`, so moving them together completes Workbench Reference command routing through the bounded client capability while preserving existing domain behavior.

## What Changes

- Extend `SynthesisClient.references` with single canonical merge, batch canonical merge, canonical metadata update, and canonical archive commands.
- Define strict request contracts for effective canonical merge pairs, optional retarget confirmation, non-empty merge batches, bounded metadata patches, and canonical archive identifiers.
- Rebuild and validate known request fields in the in-process adapter before delegating to four narrow legacy ports, while retaining opaque JSON-safe command results and stable client error behavior.
- Route the four production Workbench call sites through the lazily resolved default client while preserving aliases, trimming, defaults, batch filtering, single-flight, deferred-start, diagnostic handling, and surface invalidation.
- Keep Reference queries, Tag, Concept, Topic Graph, Sync, Host Bridge, MCP, service inventory, and domain logic unchanged.

## Capabilities

### New Capabilities

- `synthesis-workbench-canonical-reference-mutation-client-consumer`: Defines bounded canonical Reference mutation contracts, adapter validation and normalization, Workbench consumption, and migration boundaries.

### Modified Capabilities

None.

## Impact

- Synthesis contracts, in-process client adapter, and default legacy composition.
- Synthesis Workbench canonical Reference mutation routing with focused tests.
- Service-boundary and Synthesis invariant checks while retaining 125 public service methods and four direct legacy consumers.
- Current-state Synthesis README, runtime/rebuild, Workbench host, and Workbench UI documentation.
