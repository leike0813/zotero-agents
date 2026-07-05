## 1. OpenSpec

- [x] 1.1 Create proposal, design, tasks, and delta spec for single child delivery.

## 2. Shell Delivery

- [x] 2.1 Remove SkillRunner snapshot and run-dialog ready inbound bypasses from the workspace shell.
- [x] 2.2 Add cached payload generations, per-frame delivery guards, and pending-tab replay retry.
- [x] 2.3 Clear delivery guards and pending replay state on scope changes.

## 3. Tests and Verification

- [x] 3.1 Update source guards to forbid the removed bypasses and require unified child-snapshot routing.
- [x] 3.2 Add behavior smoke coverage proving successful SkillRunner payloads are not double-delivered.
- [x] 3.3 Run OpenSpec validation, workspace/UI smoke tests, TypeScript, and touched-file formatting checks.
