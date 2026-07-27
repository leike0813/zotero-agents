## Why

WebDAV synchronization and destructive maintenance have stronger crash, persistence, and admission requirements than ordinary domain mutations. Their nine operations need an isolated change so process-memory placeholders or unsupported reset ports cannot enter production readiness.

## What Changes

- Implement the nine WebDAV, runtime reconcile, public maintenance, and reset operations assigned by the R9a operation-ownership matrix.
- Persist WebDAV state, conflicts, retries, and receipts atomically while using the reverse Host only for secret-free transport.
- Implement typed maintenance/reset ports with explicit mutation admission, exclusive ownership, checkpoint, and repair rules.
- Add crash-window, restart, conflict, reset, expired request, Host failure, and Rust-only repair fixtures before ready-roster admission.

## Capabilities

### New Capabilities

- `synthesis-native-webdav-maintenance-surface`: Complete native WebDAV, maintenance, reset, reconcile, and repair semantics.

### Modified Capabilities

None.

## Impact

This change affects WebDAV and Debug/Maintenance application ports, durable receipts, reverse-Host transport, activation recovery inputs, and focused Rust/Core/Stage-1 tests. It does not itself publish the default client.
