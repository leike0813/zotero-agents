## Why

Citation Graph queries and rebuild jobs mix deterministic graph projections with paged Zotero reads, native worker execution, cache persistence, retry state, and layout receipts. Keeping these twelve operations inside the monolithic R9a dispatcher task has hidden their orchestration and failure semantics.

## What Changes

- Implement the twelve Citation Graph operations assigned by the R9a operation-ownership matrix.
- Keep graph compute in typed native workers while obtaining library inputs and applying permitted Host effects only through bounded reverse-Host ports.
- Persist cache, metrics, layout, job, retry, and supersession state through existing Rust owners.
- Add operation-level differential and restart fixtures before promoting a capability to the ready roster.

## Capabilities

### New Capabilities

- `synthesis-native-citation-graph-surface`: Complete native Citation Graph query, layout, metric, cache, and update semantics.

### Modified Capabilities

None.

## Impact

This change affects Citation Graph compatibility DTOs, worker and repository ports, reverse-Host paged library reads, durable job/cache state, and focused Rust/Core/Stage-1 tests. It does not activate production mutations or change public client methods.
