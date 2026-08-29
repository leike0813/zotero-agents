## Context

R8 already owns an isolated Rust repository/canonical foundation and a native manifest/lifecycle candidate. Its runtime implementation has two mismatches with the intended boundary:

- `runtime_service.rs` owns worker framing, operation decoding, HTTP authentication, capability handlers, repository/canonical composition, the listener, and shutdown cleanup.
- `runtime_transfer.rs` keeps JSON pages in memory and calls `synthesis_citation_graph_build::compute` directly, while `runtime_worker_pool.rs` launches and kills one process per direct request.

The external `compute.citation_graph_build_transfer` contract is already consumed by Node/Rust parity tests and must stay byte-compatible. R8 remains an isolated candidate: production DB/canonical/Host ownership, HTTP inventory, manifest v2, and `SynthesisClient` routing do not move.

## Goals / Non-Goals

**Goals:**

- Give worker framing, pool scheduling, transfer staging, capability dispatch, and service composition one explicit owner each.
- Make all direct and paged native compute use one lazy, reusable child and one admission/failure authority.
- Keep transfer memory bounded to descriptors, paths, and at most one unacknowledged frame per direction.
- Preserve sealed input across retryable attempt failures while making output publication attempt-atomic.
- Enforce limits, cleanup, cancellation, replacement, and shutdown with observable tests and static ownership checks.

**Non-Goals:**

- No R9 production cutover, new public capability, fallback, mutation authority, or XPI routing.
- No DTO, error-code, SQLite, canonical format, transfer hash/order, manifest v2, or health snapshot field change.
- No dependency, dynamic operation registry, generic workflow state machine, production fault hook, release dispatch, or Gitee work.
- No recovery of transfer sessions after process restart.

## Decisions

### 1. Split by ownership, not by transport helper

`runtime_worker` owns worker-mode stdin/stdout framing, strict operation decoding, typed request rebuild, kernel dispatch, and paged result emission. `runtime_worker_pool` owns the child handle, request queue, deadlines, cancellation, replacement, fuse, and both direct/paged execution APIs. `runtime_transfer` owns session state and filesystem staging. `runtime_capabilities` owns HTTP authentication, envelope validation, capability handlers, response bounds, and status mapping. `runtime_service` composes repository/canonical/application owners, listener lifecycle, lease checks, and failure-isolated cleanup.

This prevents the transfer owner from acquiring compute authority and prevents worker code from reaching application state. A smaller set of arbitrary utility modules would reduce file size but leave ownership ambiguous.

### 2. Use a closed typed operation enum

`WorkerOperation` enumerates the accepted native operations and maps each variant to the existing protocol operation constant. Direct and paged execution are separate typed methods. No string-keyed handler registry or extensible state machine is introduced.

The wire protocol still carries the stable operation string because Node remains a differential oracle, but parsing into the closed enum happens before dispatch.

### 3. Reuse one child until a runtime fault

The pool lazily starts the current executable in `worker` mode and retains its stdin/stdout control channel after successful tasks. One active task and at most two queued waiters share the same admission state. Success resets consecutive failures without restarting the child. Timeout, crash, protocol violation, or invalid rebuilt result terminates and clears the child, increments restart/failure accounting, and opens the three-consecutive-fault fuse.

Request validation failures, caller cancellation before execution, busy admission, and response-envelope failures do not count as runtime faults.

### 4. Stream transfer pages through narrow source/sink traits

`PagedInputSource` exposes the sealed manifest header and canonical page bytes in manifest order. `PagedOutputSink` begins an attempt, validates and atomically stages each output frame, and commits only after the terminal frame and complete manifest are present. The pool sends the next input page only after the exact worker ACK and acknowledges output only after `stage_page` succeeds.

Traits keep the pool independent of session storage without allowing a general callback registry. Direct execution continues to use a typed in-memory payload/result path.

### 5. Store transfer pages as canonical bytes beneath a disposable root

The service creates `<profileRuntimeRoot>/citation-graph-transfer` after first deleting any prior root. Each session gets an input directory, sealed manifest, and per-attempt output directory. Files are written through same-directory temporary files followed by rename. Process memory retains session identifiers, paths, descriptors, state, timestamps, attempts, and last failure.

Limits are two sessions, 4 MiB per page, 1 GiB per direction per session, and 2 GiB across the service. Idle expiry is five minutes, absolute expiry is thirty minutes, and the listener invokes a bounded reaper no more often than every thirty seconds.

### 6. Make failure cleanup asymmetric

Crash, timeout, invalid frame/result, or sink fault deletes the active attempt output, records a stable last failure, and returns the session to `input_sealed`. Explicit retry starts a fresh attempt. Cancel deletes the whole session. Process startup deletes the old transfer root; normal shutdown cancels active/queued work and removes all staging.

This preserves useful sealed input without treating ephemeral transfer data as durable state.

### 7. Keep fault hooks compile-time local

Rust tests can inject a worker executable/clock/source/sink through private constructors. Any environment fault hooks used by integration tests are compiled only under test/debug assertions and are absent from manifest, configuration DTOs, production routing, and release behavior.

### 8. Validate through one reusable corpus

A sanitized JSON corpus and Rust driver exercise begin/upload/seal/status/execute/read/cancel, ordering and integrity faults, bounds, reaping, rollback/retry, canonical bytes, and hashes. The TypeScript checker runs the Node oracle and Rust driver against the same fixtures. Actual HTTP tests add persistent-child identity, queue/fuse/replacement, control-plane responsiveness, shutdown/orphan, and restart-cleanup evidence.

The five-platform candidate workflow runs the checker before smoke. It remains read-only and does not dispatch releases.

## Risks / Trade-offs

- **[Risk] Blocking Rust threads can complicate cancellation and shutdown.** → Keep one serialized child owner, use short control polling intervals, close stdin before kill, and enforce a single 500 ms shutdown deadline.
- **[Risk] Filesystem faults can leave partial output.** → Use attempt-scoped directories, atomic page rename, validate before ACK, and remove the attempt directory on every non-commit terminal path.
- **[Risk] Holding a session mutex during worker execution would block status and health.** → Admit and snapshot descriptors under lock, run pool I/O outside the owner lock, then publish by attempt token under lock.
- **[Risk] A persistent child can carry protocol residue between tasks.** → Require exact task/operation/request hashes and terminal frames; any unexpected frame replaces the child.
- **[Risk] Restart cleanup can delete a concurrently owned root.** → Runtime ownership/lease acquisition precedes transfer-root creation, and the root is profile-runtime isolated.
- **[Trade-off] Sessions do not survive restart.** → This is deliberate ephemeral staging; clients receive `transfer_not_found` and can begin again.
- **[Trade-off] One child limits throughput.** → It preserves existing one-active/two-queued bounds and prevents memory multiplication for large graph builds.

## Migration Plan

1. Add failing Core/Rust parity and ownership tests around the current modules.
2. Extract worker framing without behavior changes.
3. replace per-call spawning with the persistent typed pool and verify direct compute.
4. replace in-memory transfer pages with disk staging and source/sink execution.
5. extract capability dispatch, reduce service composition, and add bounded reaping/cleanup.
6. add parity checker, candidate workflow gate, documentation correction, and full local validation.
7. Keep the change active after local completion; five-platform dispatch and R9 production cutover require separate authorization.

Rollback is source-only: restore the previous candidate modules and tests. No durable production data or schema needs rollback.

## Open Questions

None. The external contract, limits, retry semantics, module boundaries, and R8/R9 cutoff are fixed by this change.
