## 1. OpenSpec

- [x] 1.1 Add proposal, design, tasks, and delta specs for managed filesystem
      path governance.
- [x] 1.2 Validate `harden-managed-filesystem-path-governance` in strict mode.

## 2. Runtime Path Policy

- [x] 2.1 Add managed relative path validation helpers and structured path
      diagnostics to `runtimePersistence`.
- [x] 2.2 Add managed absolute path warning diagnostics without rejecting long
      user roots by default.
- [x] 2.3 Add tests for traversal, absolute-as-relative, reserved names,
      trailing dot/space, illegal characters, segment budget, relative path
      budget, case collision, and long-root warning behavior.

## 3. Synthesis Canonical Enforcement

- [x] 3.1 Upgrade canonical asset path validation to use the managed relative
      path policy plus KG scope allowlist.
- [x] 3.2 Validate changed and deleted assets before staging in canonical
      transactions and raw envelope import transactions.
- [x] 3.3 Add short stable canonical asset filename/path helpers and route
      citation graph high-risk assets through them.
- [x] 3.4 Add tests proving failed path policy writes create no staging, target,
      receipt, event, or projection stale side effects.

## 4. Git Sync and Integrity

- [x] 4.1 Apply managed relative path validation to Git Sync import snapshot
      paths before promotion.
- [x] 4.2 Extend persistence integrity scanning with path policy issues,
      including long legacy canonical filenames, reserved names, case
      collisions, relative path budget, and absolute path warnings.
- [x] 4.3 Add Git Sync and integrity scanner regression tests.

## 5. Documentation and Validation

- [x] 5.1 Document the Managed Path Contract in `doc/persistence-governance.md`.
- [x] 5.2 Run targeted runtime persistence, foundation, literature registry,
      citation graph, and Git Sync tests.
- [x] 5.3 Run `npx tsc --noEmit`.
- [x] 5.4 Run Prettier check for changed TS/MD files.
