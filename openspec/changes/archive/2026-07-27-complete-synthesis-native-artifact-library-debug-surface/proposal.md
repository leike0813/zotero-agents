## Why

Artifact, Library Index, schema, and Debug reads are public projections over several durable owners and filesystem-backed artifacts. Their twelve operations need stable compatibility DTOs and bounded export behavior rather than placeholder maintenance projections.

## What Changes

- Implement the twelve Artifact, Library Index, schema, and non-destructive Debug operations assigned by the R9a operation-ownership matrix.
- Preserve artifact manifests, filtered export receipts, library index projections, schema discovery, and debug inspection DTOs.
- Route artifact/library reads and export delivery through declared ports while keeping repository/canonical roots private to Rust.
- Add differential, pagination, export failure, reopen, bounds, deadline, and redaction fixtures before ready-roster admission.
- Treat the owned set as eleven read operations plus one effectful export mutation; readiness is operation-level evidence, never handler presence alone.

## Capabilities

### New Capabilities

- `synthesis-native-artifact-library-debug-surface`: Complete native artifact, library-index, schema, and non-destructive debug semantics.

### Modified Capabilities

None.

## Impact

This change affects Artifact, Library Index, Durable/Debug compatibility projections, reverse-Host export delivery, and focused parity tests. Destructive maintenance and production activation remain separate.
