## 1. Contract and Engine TDD

- [x] 1.1 Add Core 202 failing tests for authenticated execute/status/poll/output parity, normal-scale completion, and unchanged production routing.
- [x] 1.2 Extend Core 183/201 failing tests for packed/direct parity, deterministic bounded output pages, metadata-only staging, attempts, atomic commit, rollback, and retry.
- [x] 1.3 Extend Core 195 failing tests for streaming admission, one-page ACK backpressure, 30-second deadline, cancellation, replacement, fuse, and shutdown.
- [x] 1.4 Add strict transfer `execute`, execution states, attempt count, and structured failure contracts without changing the capability catalog.

## 2. Packed Graph Build Kernel

- [x] 2.1 Implement the environment-neutral packed accumulator and deterministic result paginator with existing bounds, cross-page validation, checkpoints, and no duplicated graph semantics.
- [x] 2.2 Adapt the existing direct engine to the shared kernel while preserving request/result API, ordering, diagnostics, and existing fixtures.
- [x] 2.3 Implement exact canonical output pagination under 4 MiB/100k JSON-node limits and export only the required engine helpers.

## 3. Transfer Owner and Executor

- [x] 3.1 Refactor the transfer owner to retain descriptor/path metadata only and add strict service-internal input reads.
- [x] 3.2 Add queued/executing/publication attempt lifecycle, output byte accounting, tombstone rollback, atomic output commit, and idempotent retry behavior.
- [x] 3.3 Add a transfer executor that owns pool admission, per-attempt AbortController state, status publication, stable failure mapping, and lifecycle cancellation.

## 4. Streaming Worker and HTTP Integration

- [x] 4.1 Extend the closed worker protocol and shared pool with a task-scoped MessagePort, one-page input/output acknowledgements, existing resource limits, and transfer-only 30-second active deadline.
- [x] 4.2 Extend the worker entrypoint to strictly decode pages, feed the packed accumulator, emit bounded output pages, and remain filesystem/Host/repository free.
- [x] 4.3 Dispatch authenticated asynchronous execute through the server and add strict internal transfer-client execution/status handling without exposing public SynthesisClient routes.
- [x] 4.4 Integrate shutdown, host lease, stdin EOF, session cancel, health/handshake, and pool fuse behavior within the existing 500ms total budget.

## 5. Packaging, Governance, and Documentation

- [x] 5.1 Extend Core 168/192-194/199 and boundary/package checks for capability parity, emitted files, fingerprints, worker imports, eight engines, `108 / 1`, and `mutationEnabled: false`.
- [x] 5.2 Update service migration inventory, normal/target/stress benchmark reporting, Synthesis runtime/packaging/performance/sequence docs, README, and Stage 1 progress.

## 6. Verification

- [x] 6.1 Run targeted Core suites including normal-scale Core 202, contracts/engine/service/root TypeScript, service boundary, and Synthesis invariants; resolve regressions.
- [x] 6.2 Run Prettier/ESLint, help-doc check, production build, `git diff --check`, and strict OpenSpec validation without generating prebuilds, committing, archiving, or modifying `reference/Skill-Runner`.
