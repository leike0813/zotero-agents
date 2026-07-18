## Why

Synthesis Workbench progress polling still bypasses the client boundary and its legacy service read implicitly reconciles persisted running operations. A narrow, side-effect-free client query is required before polling can migrate without letting ordinary UI or debug reads mutate operation lifecycle state.

## What Changes

- Add `SynthesisClient.workbench.readProgress()` as a no-argument, opaque JSON projection read.
- Route Workbench progress polling through the default client while preserving chrome publication, Git Sync handling, cadence, locking, and error fallback.
- Make service construction, background-job progress reads, and debug progress reads side-effect-free.
- Reconcile persisted running operations only during explicit startup lifecycle, canceling every restart orphan without a live-session timestamp timeout.
- Keep commands, mutations, Host Bridge, MCP, the public service method, migration inventory, and process/storage ownership unchanged.

## Capabilities

### New Capabilities

- `synthesis-workbench-progress-client-consumer`: Defines the narrow Workbench progress client read, pure progress-query semantics, startup-only orphan reconciliation, and migration boundaries.

### Modified Capabilities

- `synthesis-work-governance`: Makes explicit startup reconciliation the only cancellation owner for persisted restart-orphan operations and removes live-session timestamp cancellation.

## Impact

- Synthesis contracts, in-process client adapter, and default legacy composition.
- Synthesis Workbench progress polling and operation lifecycle handling.
- Workbench, client, service lifecycle, boundary, and invariant tests.
- Current-state Synthesis README, runtime/rebuild, Workbench host/UI, and invariants documentation.
