## Why

The Synthesis Workbench still bypasses the client boundary for Concept KB rebuild, display-text update, review action, and deletion commands. These four paths form one bounded Concept command slice, so moving them together removes direct service coupling while preserving Concept domain ownership, Workbench orchestration, and current UI behavior.

## What Changes

- Add an environment-neutral `SynthesisConceptsClient` with Concept KB rebuild, display-text update, review action, and deletion commands.
- Define strict request contracts for Concept identifiers, bounded display fields, review actions, optional merge targets, and non-empty deletion batches.
- Rebuild and validate known fields in the in-process adapter before delegating to four narrow legacy ports, while retaining opaque JSON-safe command results and stable client error behavior.
- Route the four production Workbench Concept command paths through the lazily resolved default client while preserving trimming, aliases, single-flight, protected rebuild behavior, deferred start, diagnostic handling, and Concepts/Review invalidation.
- Keep Concept queries and checkpoint export, Tag, Topic Graph, Sync, Topic artifact, Host Bridge, MCP, service inventory, and Concept KB domain logic unchanged.

## Capabilities

### New Capabilities

- `synthesis-workbench-concept-command-client-consumer`: Defines bounded Concept command contracts, adapter validation and normalization, Workbench consumption, and migration boundaries.

### Modified Capabilities

None.

## Impact

- Synthesis contracts, in-process client adapter, and default legacy composition.
- Synthesis Workbench Concept command routing with focused tests.
- Service-boundary and Synthesis invariant checks while retaining 125 public service methods and four direct legacy consumers.
- Current-state Synthesis README, runtime/rebuild, Workbench host, and Workbench UI documentation.
