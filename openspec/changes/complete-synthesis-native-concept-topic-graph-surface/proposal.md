## Why

Concept KB and Topic Graph operations share review and index invariants but expose different public request shapes from their internal typed applications. These nine operations need explicit compatibility adapters and durable review evidence.

## What Changes

- Implement the nine Concept KB and Topic Graph operations assigned by the R9a operation-ownership matrix.
- Adapt public query, display-text, deletion, relation, review, and rebuild requests to typed Rust CAS/basis contracts.
- Persist accepted/rejected review state and index rebuild results through existing Rust owners.
- Add differential, stale-basis, restart, deterministic-index, bounds, and deadline fixtures before ready-roster admission.

## Capabilities

### New Capabilities

- `synthesis-native-concept-topic-graph-surface`: Complete native Concept KB and Topic Graph public semantics.

### Modified Capabilities

None.

## Impact

This change affects Concept and Topic Graph compatibility/application ports, repository and canonical adapters, and focused parity tests. It does not alter public DTOs or activate production.
