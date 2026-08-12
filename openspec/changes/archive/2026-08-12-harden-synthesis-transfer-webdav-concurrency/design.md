## Context

`NativeTransferOwner` owns session metadata, but active attempts move input and output handles into detached threads. `reap`, `cancel`, and `stop` can remove the session root while those handles are live. Output sinks reserve shared bytes and later release them through unrelated JSON publication parsing; `stop` sets the counter to zero, so a late rollback can underflow it. Transfer and public maintenance threads are not joined before `Arc::try_unwrap(state)`.

WebDAV single-flight admission prevents two sync bodies, but it does not serialize pause/resume/retry state patches with sync completion. `FileWebDavStateStore` uses shared `.pending` and `.previous` names without a transaction owner. The production scheduler returns true when its stored canceled generation differs from the requested generation and sleeps at most one second, which reverses the intended continuation predicate and does not implement the documented retry delays.

## Goals / Non-Goals

**Goals:**

- Make every spawned transfer attempt and public maintenance worker visible to one shutdown owner.
- Keep active transfer files and byte reservations alive until their final owner releases them exactly once.
- Preserve current wire states, transfer bounds, restart cleanup, maintenance receipts, and the 500 ms native shutdown budget.
- Make WebDAV state transitions linearizable within the process and stop retry waits immediately.

**Non-Goals:**

- Persist transfer sessions across restart or change transfer TTLs and capacity limits.
- Roll back remote WebDAV effects that completed before pause or stop was observed.
- Fix application differential gates, performance fixtures, full core loading, Related Items echo, or desktop smoke.

## Decisions

### 1. One background registry owns native detached work

`ServeState` owns a registry that accepts named tasks while running, supplies each task a cancellation flag, reaps completed joins during ordinary listener polling, and on shutdown closes admission, requests cancellation, and joins until the shared 500 ms deadline. Transfer attempts and public maintenance controllers use this registry; the canonical autosync worker retains its existing dedicated owner.

The registry is not a work queue and does not claim durable operations. It only owns thread lifetime. If the deadline expires, shutdown reports the remaining task count and does not close repository/canonical owners still referenced by those tasks.

### 2. Transfer cancellation is logical before physical

Each session tracks an active attempt and a cleanup-requested state. Reaping skips queued, executing, and publishing sessions at the idle boundary. Absolute expiry, explicit cancel, and service stop immediately set cancellation and remove external visibility/idempotency ownership, but defer directory removal and byte release until the active attempt finishes. Attempt completion performs cleanup instead of publication when cleanup was requested.

### 3. Byte reservations transfer ownership by type

A reservation object acquires service bytes atomically and releases its remaining balance on drop. Input pages transfer reservation ownership into the session; output pages remain owned by the sink until commit returns a typed publication, then transfer into the session on successful adoption. No path resets the shared counter, parses a JSON byte count to release capacity, or subtracts the same reservation twice.

### 4. WebDAV state and retry generations have single owners

The application serializes each complete load-normalize-patch-save transition with one transaction mutex. A sync run does not hold that mutex across Host I/O; terminal persistence reloads the latest state and preserves concurrently established control fields such as `paused`. The file store separately serializes atomic replacement so `.pending` and `.previous` names cannot collide.

The scheduler uses a mutex and condition variable containing a monotonic canceled-generation watermark. `wait(delay, generation)` returns true only if the full delay elapsed while that generation remained current; cancellation wakes it immediately and returns false. Production uses the exact 60s/5m/15m/30m schedule.

## Risks / Trade-offs

- [A task ignores cancellation past 500 ms] -> Shutdown reports a stable drain timeout and deliberately avoids closing shared storage beneath the task; the supervisor retains its existing force-stop fallback.
- [Absolute TTL is reached during execution] -> The session becomes inaccessible immediately, while physical capacity is reclaimed on attempt return rather than violating file ownership.
- [Pause races with a completed remote write] -> The final state preserves `paused`; no later retry is scheduled, but already completed remote bytes are not falsely reported as rolled back.
- [Long retry delays slow tests] -> Tests use injected schedulers and condition variables; real-process stop evidence blocks in the first wait and cancels it immediately.

## Migration Plan

No durable schema migration is required. Existing transfer roots remain disposable at startup. Existing WebDAV JSON is loaded and atomically rewritten through the serialized store. Rollback restores the prior runtime without changing persisted formats.
