## Context

See `proposal.md`. The native listener currently accepts every loopback socket
and returns HTTP 503 after sixteen handlers are active. Workbench surface and
progress reads are individually guarded, but chrome reads are not, and multiple
Workbench runtimes share the same sidecar. The default client dynamically reads
the supervisor connection yet has no recovery callback when that connection is
lost. Error normalization preserves `sidecarReason`, while v2 trace terminals
currently retain only the broader code.

The production lifecycle remains owned by `runtime_service::serve`; the server
loop may own only the listener, active sockets, handler threads, interruption,
and drain. Recovery remains owned by the production owner and supervisor.

## Goals / Non-Goals

**Goals:**

- Keep the sixteen-handler resource ceiling without turning ordinary bursts
  into immediate user-visible failures.
- Remove avoidable duplicate Workbench chrome reads.
- Recover a lost post-ready generation once at the shared owner seam, before
  dispatch, for every production-client caller.
- Make future unavailable traces self-classifying without exposing raw errors.

**Non-Goals:**

- Raising the connection limit, adding a custom socket queue, or retrying a
  request after dispatch.
- Automatically recovering disabled, incompatible, normally stopped, or
  deterministic startup failures.
- Adding a new diagnostics UI, changing storage/discovery formats, or exposing
  process output in production.

## Decisions

### Leave saturated connections in the OS backlog

`RuntimeServerLoop::poll` will reap completed handlers, check active capacity,
and skip `accept` while all sixteen slots are occupied. Once a slot is released,
the next poll accepts the next pending socket. The existing HTTP read deadlines
bound slow clients, while the OS backlog supplies the only pending queue.
Accepted sockets are explicitly restored to blocking mode before those bounded
deadlines are configured; otherwise Windows can surface a transient
`WouldBlock` as `request_timeout` and close the still-writing client with
`ECONNRESET`.

This is preferred over increasing the limit, which only postpones an unbounded
caller problem, and over a TypeScript semaphore, which cannot coordinate every
client instance or reserve lifecycle traffic reliably.

### Coalesce chrome refreshes at the Workbench runtime

Chrome will use one in-flight flag, one queued flag, and a queued-force bit.
Overlapping requests merge force with boolean OR. Completion schedules one
follow-up using the latest revision rules; cleanup clears queued state. The
existing surface request state machine remains unchanged because its keyed
surface semantics differ.

### Recover only before RPC dispatch

Native client composition receives a recovery callback beside
`getReadyConnection`. When preflight finds no connection, it asks the production
owner for eligible recovery, reacquires the ready connection, and dispatches
once. The owner shares its existing recovery/start task among concurrent calls
and latches one automatic attempt to the failed supervisor generation. Ready
publication resets the latch. Manual recovery remains independent.

The callback is not used for `composition_disposed`, transport failures, HTTP
errors, response validation failures, or any request that reached
`rpcClient.call`.

### Extend v2 identities with a safe reason

Observation identities gain an optional `reason` string. Client preflight uses
fixed reasons such as `service_not_ready`; transport failures use
`transport_unavailable`; sidecar errors reuse only the already-sanitized bounded
reason. The schema identifier remains v2 because the field is additive and
optional.

## Risks / Trade-offs

- [A saturated backlog can delay shutdown traffic] → Existing 500 ms idle and
  30 second total request deadlines release slow handlers; lifecycle shutdown
  still interrupts admitted sockets and does not wait for backlog requests.
- [Transparent recovery could duplicate work] → Recovery is permitted only
  before `rpcClient.call`; no dispatched request is replayed.
- [Repeated failures could cause restart churn] → One automatic attempt is
  latched per failed supervisor generation; explicit user recovery is required
  afterward.
- [Coalescing can delay intermediate chrome states] → One latest follow-up is
  retained, and the existing revision guard continues to reject stale results.

## Migration Plan

No data migration is required. Ship the TypeScript and native runtime changes
in the same plugin build. Rollback restores immediate 503 admission and manual
recovery without changing persisted state or wire schema compatibility.
