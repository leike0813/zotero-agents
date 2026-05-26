## 1. OpenSpec

- [x] 1.1 Create proposal, design, delta specs, and tasks for the change.
- [x] 1.2 Validate the OpenSpec change in strict mode.

## 2. Git Sync Service

- [x] 2.1 Add Git Sync DTO types, adapter interface, status, queue, lock, receipt, conflict report, validation report, and diagnostic models.
- [x] 2.2 Implement sync state initialization, sanitized remote display, queue transitions, pause/resume/retry, and single-worker lock behavior.
- [x] 2.3 Implement canonical export/import validation with allowlisted paths, manifest hashing, path traversal rejection, sensitive data rejection, and projection exclusion.
- [x] 2.4 Implement sync transaction orchestration with fake-adapter-compatible fetch/merge/push, conflict gate, failure-safe import, receipts, and projection stale marking.

## 3. Synthesis Service and Workbench

- [x] 3.1 Add Synthesis service facade methods for Git Sync state, manual sync, queue control, diagnostics, and conflict action placeholders.
- [x] 3.2 Add Workbench UI model state for sync status, queue, sanitized remote/branch, conflict report, diagnostics, and action state.
- [x] 3.3 Render Sync panel/status/actions in Workbench without exposing raw credentials or raw Git terminology as the primary UX.

## 4. Tests and Validation

- [x] 4.1 Add core tests for disabled state, export allowlist, import rejection, success sync, conflict gate, failure-safe import, queue transitions, and redacted diagnostics.
- [x] 4.2 Extend Workbench and sync recovery tests to verify Git Sync UI state and Zotero mirror recovery independence.
- [x] 4.3 Run focused OpenSpec, core, TypeScript, and formatting validations.
