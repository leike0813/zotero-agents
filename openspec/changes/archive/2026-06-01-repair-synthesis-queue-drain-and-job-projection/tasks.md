## 1. OpenSpec

- [x] 1.1 Add change artifacts for queue drain and job projection repair.
- [x] 1.2 Update active specs for Workbench, job progress, Host Bridge debug,
      and related-items sync scheduling.
- [x] 1.3 Validate the change with `npx openspec validate repair-synthesis-queue-drain-and-job-projection --strict`.

## 2. Runtime

- [x] 2.1 Remove update queue aggregate rows from Workbench background jobs.
- [x] 2.2 Align `debugSynthesisJobsList` with Workbench background job rows and
      preserve raw progress rows behind `includeRawRows`.
- [x] 2.3 Add bounded dirty-event drain scheduling for enqueue/retry/resume and
      service startup.
- [x] 2.4 Add related-items sync durable job progress and retryable failure on
      host/write failures.
- [x] 2.5 Add stale queued dirty-event diagnostics for UI/debug projections.
- [x] 2.6 Reconcile startup detector state back to `ready` after generated
      dirty work settles and avoid projecting it as a duplicate queued job.
- [x] 2.7 Mark stale running durable progress rows retryable before
      Workbench/debug projection.

## 3. Tests

- [x] 3.1 Update UI projection tests to assert no duplicate queue aggregate job.
- [x] 3.2 Add debug jobs consistency coverage.
- [x] 3.3 Add auto-drain coverage for successful related-items sync, host
      failure, pause/resume, and progress reporting.
- [x] 3.4 Add regression coverage for settled startup reconcile dirty work.
- [x] 3.5 Add regression coverage for stale running progress rows.

## 4. Docs and Verification

- [x] 4.1 Update `doc/synthesis-layer` runtime, Workbench, state machine, and
      sequence docs.
- [x] 4.2 Run focused tests, invariant suite, TypeScript, build, OpenSpec
      validation, and touched-file Prettier check.
