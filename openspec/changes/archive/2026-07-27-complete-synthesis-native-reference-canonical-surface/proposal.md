## Why

Reference matching and canonical revision operations form one consistency boundary: matching jobs consume Host library state, while review and canonical mutations require basis checks, durable receipts, and stable batch semantics. Treating these sixteen operations as generic dispatcher entries allowed incompatible adapters to look complete.

## What Changes

- Implement the sixteen Reference and Canonical operations assigned by the R9a operation-ownership matrix.
- Preserve public ranking, attention, review, proposal, batch, merge, metadata, archive, refresh, retry, and advanced-matching DTOs.
- Route matching compute and Host reads through typed worker/reverse-Host ports and canonical changes through the sole Rust production owner.
- Add differential, conflict, batch-atomicity, restart, and failure fixtures before ready-roster admission.

## Capabilities

### New Capabilities

- `synthesis-native-reference-canonical-surface`: Complete native Reference Matcher and canonical-reference public semantics.

### Modified Capabilities

None.

## Impact

This change affects Reference compatibility/application ports, canonical and repository adapters, worker/Host boundaries, and focused parity tests. It adds no generic dispatch, direct Host access, production activation, or legacy fallback.
