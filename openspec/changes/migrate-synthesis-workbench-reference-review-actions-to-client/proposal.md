## Why

The Synthesis Workbench still bypasses the client boundary for canonical revision review and Reference match proposal decisions. These three mutation paths share a bounded review/proposal DTO surface, so moving them together removes direct service coupling while preserving the existing Workbench command behavior and domain semantics.

## What Changes

- Extend `SynthesisClient.references` with canonical revision review, single proposal action, and batch proposal decision commands.
- Define strict request contracts for review identifiers, allowed action enums, and discriminated manual targets for Zotero items or canonical references.
- Rebuild and validate known request fields in the in-process adapter before delegating to three narrow legacy ports, while retaining opaque JSON-safe command results and stable client error behavior.
- Route the three production Workbench review/proposal call sites through the lazily resolved default client while preserving aliases, trimming, defaults, batch filtering, single-flight, diagnostic handling, and Index/Review/Graph invalidation.
- Keep canonical merge and batch merge, metadata update, archive, Reference queries and maintenance, other Synthesis domains, Host Bridge, MCP, service inventory, and domain logic unchanged.

## Capabilities

### New Capabilities

- `synthesis-workbench-reference-review-client-consumer`: Defines the bounded Reference review/proposal client contracts, adapter validation and normalization, Workbench consumption, and migration boundaries.

### Modified Capabilities

None.

## Impact

- Synthesis contracts, in-process client adapter, and default legacy composition.
- Synthesis Workbench canonical review and proposal decision routing with focused tests.
- Service-boundary and Synthesis invariant checks while retaining 125 public service methods and four direct legacy consumers.
- Current-state Synthesis README, runtime/rebuild, Workbench host, and Workbench UI documentation.
