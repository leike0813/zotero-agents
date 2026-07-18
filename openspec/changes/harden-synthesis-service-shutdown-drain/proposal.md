## Why

The Synthesis service shutdown chain stops at the first rejected cleanup, which
can leave later owners open, the HTTP server listening, and `runtime.stopped`
unresolved. The Topic application also does not track admitted apply work, so
its canonical and repository owners can close while an apply is still running.

## What Changes

- Track every admitted Topic apply and expose an idempotent application
  shutdown that stops admission and drains all active work.
- Replace duplicated service owner cleanup chains with one failure-isolated
  path shared by normal shutdown and post-composition listen failure rollback.
- Continue cleanup after synchronous throws or asynchronous rejections, record
  structured redacted failures, and always complete HTTP shutdown signaling.
- Preserve the original listen error when rollback cleanup also fails.

## Capabilities

### New Capabilities

- `synthesis-sidecar-shutdown-drain`: Defines admitted Topic work draining,
  failure-isolated owner cleanup, terminal HTTP close, and listen rollback
  error preservation.

### Modified Capabilities

None.

## Impact

- Affects the environment-neutral Topic application interface, Synthesis
  service lifecycle composition, focused Core tests, and service build output.
- Does not change DTOs, RPC capabilities, HTTP payloads, service inventory,
  database formats, dependencies, runtime/XPI assets, or production routing.
