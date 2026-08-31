## Context

`applySeam.ts`, `sequenceStepApply.ts`, and `skillRunnerForegroundContinuation.ts`
each carry a private `createBundleReaderForRunResult` with the same three-way
branch and each cleans the temp path in a local `finally`.
`SkillRunnerClient.normalizeBundleTerminalResult` repeats the bytes → temp zip →
dispose sequence. The primitives already live in `bundleIO.ts`, so the policy
and lifecycle are leaking across the seam.

## Goals / Non-Goals

**Goals:**

- Make one deep Bundle I/O entry own branch selection, temp file creation, and temp file disposal.
- Reduce caller interfaces to one handle with reader, path, and dispose.
- Preserve existing branch precedence and cleanup scope exactly.
- Keep apply-seam dependency injection testable.

**Non-Goals:**

- Changing result context resolution, artifact paths, or apply hook behavior.
- Cleaning extracted zip directories from `dispose()`.
- Adding a status gate or validation beyond current callers.
- Rewriting persisted bundle data or provider protocols.

## Decisions

### Open + dispose handle

`openRunResultBundleReader({ result, requestId })` returns a handle. `bundlePath`
is always a string and remains empty for directory and unavailable branches, so
existing truthiness expectations stay valid. `dispose()` is async,
best-effort, and idempotent; it removes only the temp zip file when one was
written.

### Bundle I/O owns ZipBundleReader

Bundle I/O imports `ZipBundleReader` directly. This keeps all three branches in
one module; no import cycle exists. The apply seam injects the complete opener
rather than individual zip/temp primitives, preserving seam-level test seams
without widening the production interface.

### Preserve branch precedence

Non-empty `bundleBytes` win over `bundleDir`; empty bytes fall through to the
directory. No bundle source opens the existing unavailable reader. No status
check is added because callers already only open terminal results when apply is
authorized.

### Explicit handle arrays for compound applies

Sequence and aggregate apply paths collect open handles in explicit resources
arrays and dispose every handle in the owning `finally`. The enriched sequence
and aggregate contexts remain data-only.

### Provider bundle settlement uses the same seam

`normalizeBundleTerminalResult` opens the handle before candidate reads and
disposes it in the existing `finally`. The returned result does not expose the
temp path.

## Risks / Trade-offs

- [bundleIO gains a workflows import] -> ZipBundleReader has no back-import into workflowExecution, and tsc/ESLint gate cycles through module boundaries.
- [Dispose timing changes slightly] -> Creation and cleanup still happen at the same points; only the code owner moves.
- [Handle arrays can be forgotten] -> Compound apply scopes dispose in `finally` and integration tests cover aggregate and sequence bundle paths.
- [Empty-bytes edge] -> Contract tests pin that empty bytes fall through to the directory.

## Migration Plan

Add failing Bundle I/O contract tests, implement the open/dispose entry, migrate
sequence step apply and foreground continuation, migrate the provider client,
then migrate the apply seam and its dependency object. Update documentation and
archive the OpenSpec change. No data migration; rollback is a source revert.
