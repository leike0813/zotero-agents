# Proposal

## Why

A health-triggered sidecar replacement can be invalidated by its predecessor's delayed exit callback. The healthy replacement retains the production lock while further launches conflict and fuse; progress polling then floods the bounded runtime log.

## What Changes

- Make session retirement and failure handling single-owner, and fence asynchronous completion by both supervisor generation and session identity.
- Pause service-dependent progress observation while the runtime is known unavailable and back off transient unavailable reads for five seconds.
- Persist the specific, sanitized health-control failure alongside the existing lifecycle reason code.
- Add focused regression coverage and document recovery ownership.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-sidecar-runtime-supervision`: session-scoped retirement, asynchronous fencing, and persisted health failure causes.
- `synthesis-workbench-progress-client-consumer`: readiness-aware polling and bounded unavailable retry cadence.
- `runtime-log-pipeline`: allow a bounded stable health-control cause in lifecycle incidents while keeping business logs transport-free.

## Impact

TypeScript supervisor/control client, Workbench polling, existing Node regression suites, and lifecycle documentation. Public DTOs, RPC contracts, native binaries, storage schemas, and restart budgets remain unchanged. No build, installation, live-process manipulation, or Git commit is included.
