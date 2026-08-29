## 1. Contract and Test Harness

- [x] 1.1 Extend Core 195/196 tests for persistent native child reuse, mixed direct/paged admission, replacement, fuse, cancellation, and wire isolation
- [x] 1.2 Extend Core 201/202 tests for disk staging, canonical parity, rollback/retry, TTL/reap, restart cleanup, and responsive control-plane reads
- [x] 1.3 Add a sanitized native worker-transfer parity corpus, Rust driver, TypeScript checker, and package command
- [x] 1.4 Add static ownership checks that prohibit transfer-to-kernel and worker-to-application imports

## 2. Worker Runtime and Pool

- [x] 2.1 Extract worker framing, closed `WorkerOperation` dispatch, strict direct requests, and paged input/output into `runtime_worker`
- [x] 2.2 Implement one lazy reusable child with one-active/two-queued admission and shared direct/paged typed execution in `runtime_worker_pool`
- [x] 2.3 Implement exact frame acknowledgement, deadlines, queued/active cancellation, child replacement, and three-failure fuse
- [x] 2.4 Implement bounded 500 ms shutdown that wakes queued tasks, closes the control pipe, and terminates the child without orphans

## 3. Transfer Ownership

- [x] 3.1 Replace in-memory pages with canonical byte staging beneath a restart-cleaned isolated profile runtime transfer root
- [x] 3.2 Enforce two sessions, 4 MiB pages, 1 GiB per direction, 2 GiB service total, idle/absolute TTL, and bounded 30-second reaping
- [x] 3.3 Implement `PagedInputSource` and attempt-scoped `PagedOutputSink` with strict validation and atomic page writes
- [x] 3.4 Route execute through the shared pool, preserve sealed input on retryable failure, rollback partial output, and delete sessions on cancel

## 4. Capability and Service Composition

- [x] 4.1 Extract authentication, envelope validation, explicit capability handlers, bounded responses, and HTTP error mapping into `runtime_capabilities`
- [x] 4.2 Reduce `runtime_service` to repository/canonical/application composition, listener/lease lifecycle, reaper scheduling, and failure-isolated cleanup
- [x] 4.3 Preserve health/handshake capability, compute-pool snapshot, transfer snapshot, public DTOs, errors, and production routing

## 5. Governance and Documentation

- [x] 5.1 Run the native worker-transfer checker before smoke in the five-platform read-only candidate workflow
- [x] 5.2 Add the checker to Stage-1/local parity gates without dispatching or publishing
- [x] 5.3 Correct stale R7/R8 native runtime status in `doc/synthesis-layer/README.md`

## 6. Verification

- [x] 6.1 Pass Rust fmt, clippy, workspace tests, native worker-transfer parity, and all existing parity checkers
- [x] 6.2 Pass Core 195/196/201/202, Stage-1 44-file suite, typecheck, ESLint, and relevant Prettier checks
- [x] 6.3 Pass production build, native smoke, 15/75 MiB gates, OpenSpec strict validation, and `git diff --check`
- [x] 6.4 Record any unavailable remote five-platform evidence as an R8 acceptance boundary and leave the change active
