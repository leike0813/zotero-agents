## Why

R9a currently treats eighteen Topic and Workbench operations as part of one 95-operation task, even though their public DTOs combine repository state, canonical artifacts, workflow projections, background-job rows, and Host effects. This change gives that surface one owner and an independent parity gate.

## What Changes

- Implement the eighteen operations assigned to this change by the R9a operation-ownership matrix.
- Rebuild the legacy-compatible Topic, resolver, report, digest, discovery, Workbench, and background-job DTOs over typed Rust applications and declared reverse-Host ports.
- Add operation-level differential fixtures for stable results, pagination, errors, durable mutations, restart behavior, bounds, and deadlines.
- Admit only fixture-backed operations to the native ready roster; production activation remains out of scope.

## Capabilities

### New Capabilities

- `synthesis-native-topic-workbench-surface`: Complete native Topic and Workbench public semantics without a legacy runtime fallback.

### Modified Capabilities

None.

## Impact

This change affects the Rust production compatibility/application ports, Topic and Workbench repositories and canonical adapters, reverse-Host handlers used by these operations, the shared parity corpus, and focused Core/Stage-1 tests. It adds no dependency, production activation, release action, or legacy deletion.
