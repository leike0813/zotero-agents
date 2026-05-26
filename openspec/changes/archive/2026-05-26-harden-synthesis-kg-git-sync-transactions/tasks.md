## 1. OpenSpec

- [x] 1.1 Create proposal, design, delta specs, and tasks for the hardening change.
- [x] 1.2 Validate the OpenSpec change in strict mode.

## 2. Foundation Transaction Hardening

- [x] 2.1 Add a raw canonical envelope batch transaction helper with staging, backup, promote, rollback, receipt, event, diagnostics, and projection stale marking.
- [x] 2.2 Add tests proving changed assets include all raw imported assets and failed promotion leaves targets unchanged.

## 3. Git Sync Hardening

- [x] 3.1 Route Git Sync imports through the Foundation batch transaction helper.
- [x] 3.2 Replace instance-only lock behavior with persistent lock file acquisition, expiry, stale takeover, and release.
- [x] 3.3 Add debounced store-change worker behavior while preserving manual sync semantics.
- [x] 3.4 Preserve affected conflict assets in state and diagnostics without leaking sensitive data.

## 4. Workbench UI

- [x] 4.1 Extend UI model state with Git Sync conflict asset rows.
- [x] 4.2 Render conflict affected assets in the Workbench Sync panel with retry/review actions.

## 5. Tests and Validation

- [x] 5.1 Extend Git Sync, Foundation, UI, and sync recovery tests for the hardening behavior.
- [x] 5.2 Run focused OpenSpec, core, TypeScript, and formatting validations.
