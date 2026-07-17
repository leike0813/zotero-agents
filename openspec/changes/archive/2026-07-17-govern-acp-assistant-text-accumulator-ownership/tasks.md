## 1. Contract Tests

- [x] 1.1 Add table-driven tests for the Chat silent terminal collector and update execution-progress tests to require text-free state and snapshots.
- [x] 1.2 Extend ACP Chat transcript tests for silent success/error, hard and soft boundaries, and live-to-silent terminal settlement without history duplication.

## 2. Runtime Ownership Split

- [x] 2.1 Implement the Chat-owned, prompt-local silent terminal assistant collector using the shared transcript semantic boundary classifier.
- [x] 2.2 Remove assistant text, candidate change signals, and candidate APIs from shared ACP execution progress.
- [x] 2.3 Route ACP Chat silent updates, settlements, mode transitions, and cleanup through the new collector while preserving current transcript semantics.
- [x] 2.4 Remove obsolete ACP Skills progress-candidate cleanup without changing its orchestrator accumulator or output convergence paths.

## 3. Verification

- [x] 3.1 Run focused execution-progress, ACP Chat, and ACP Skills tests and resolve only change-related failures.
- [x] 3.2 Run TypeScript, formatting, lint, OpenSpec validation, and source searches proving execution progress no longer retains assistant text.
