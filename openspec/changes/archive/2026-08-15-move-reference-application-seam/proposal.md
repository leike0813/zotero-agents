## Why

Reference orchestration is split between environment-neutral application modules and a 4,600-line runtime module that also owns repository transactions, reverse-Host paging, semantic projection, and durable mutation rules. Moving the seam into `synthesis-application` concentrates Reference knowledge behind one typed interface and removes the runtime's `RepositoryPort::owner()` escape without changing public behavior.

## What Changes

- Introduce one environment-neutral `ReferenceApplication` interface grouped by read, refresh, matching/review, canonical mutation, and quiesce use cases.
- Keep Reference Refresh, Reference Matching, and Canonical Reference Mutation as independently verifiable internal modules with dedicated high-level persistence interfaces.
- Move typed Host access, bounded paging, semantic projection, mutation planning, idempotency, basis checks, and cache invalidation behind the application seam.
- Require every durable Reference write to receive a per-call promotion checkpoint while leaving public maintenance admission and terminal lifecycle ownership in the runtime.
- Reduce runtime Reference code to wire translation and production adapters, then delete the former runtime application owner and its repository escape.
- Preserve all sixteen public Reference/Canonical operations, wire DTOs, durable formats, operation identities, and lifecycle semantics.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-application-foundation`: Require one typed Reference application owner and restrict runtime callers to its grouped interface.
- `synthesis-native-reference-canonical-surface`: Assign canonical consistency and semantic projection to the application owner while preserving wire compatibility and runtime lifecycle ownership.
- `synthesis-sidecar-reference-refresh-application-foundation`: Compose the existing refresh protocol behind the Reference application seam and require an explicit per-call promotion checkpoint for durable writes.
- `synthesis-rust-citation-reference-application-parity`: Exercise Reference behavior through the unified application seam while retaining independent durable owners and close/reopen evidence.

## Impact

The change affects the Synthesis application, repository, and runtime crates, the citation/reference parity example, and Synthesis architecture documentation. It introduces no dependency, protocol, schema, durable-format, public-route, or Host Bridge change.
