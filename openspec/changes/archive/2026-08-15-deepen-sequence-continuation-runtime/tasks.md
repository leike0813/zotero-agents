## 1. Shared sequence advancement

- [x] 1.1 Add focused failing tests for externally completed-step parity,
  replay idempotency, request-id conflicts, and terminal-root stability.
- [x] 1.2 Implement a shared successful-step advancement path and public
  external-completion entry in `sequenceRuntime.ts`.
- [x] 1.3 Harden sequence state transitions so terminal roots cannot be reopened
  and bound step request identities cannot be overwritten.

## 2. Lifecycle cleanup ownership

- [x] 2.1 Add focused failing tests for the explicit cleanup barrier in normal
  and recovered ACP continuation.
- [x] 2.2 Introduce the explicit ACP lifecycle adapter and remove controller
  cleanup side effects from step apply execution.
- [x] 2.3 Migrate normal execution, ACP recovery, and SkillRunner foreground
  continuation to the shared runtime entry and delete redundant shallow
  helpers and branches.

## 3. Root settlement and apply ownership

- [x] 3.1 Add focused failing tests for root-before-outer-apply ordering, outer
  apply failure, and short-circuit actual-terminal apply ownership.
- [x] 3.2 Add `terminal_step_id` to sequence result metadata and make normal and
  recovered apply seams use it as the ownership source.

## 4. Documentation and verification

- [x] 4.1 Update workflow execution and SkillRunner sequence recovery documents
  to describe the shared advancement seam and current apply/barrier semantics.
- [x] 4.2 Run focused tests, SSOT invariants, TypeScript checks, and formatting
  and lint checks for changed files.
