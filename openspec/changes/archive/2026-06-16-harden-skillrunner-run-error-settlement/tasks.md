## 1. OpenSpec Contracts

- [x] 1.1 Add proposal, design, and delta specs for request-scoped SkillRunner terminal error settlement.
- [x] 1.2 Validate the change with `npx openspec validate harden-skillrunner-run-error-settlement --strict`.

## 2. Error Classification And Settlement

- [x] 2.1 Add structured SkillRunner HTTP error metadata and helpers for terminal run-level versus recoverable backend/transport errors.
- [x] 2.2 Add a centralized request settlement helper that marks task runtime, dashboard history, and request ledger as failed while stopping session sync.

## 3. Provider And Queue Recovery

- [x] 3.1 Prevent post-create `400/404/410/422` failures and backend terminal states from being coerced into recoverable `running` jobs.
- [x] 3.2 Keep network, timeout, `429`, and `5xx` post-create failures on the existing recoverable path.
- [x] 3.3 Emit SkillRunner `request-ready` only after upload succeeds, and keep `request-created` as an identity-only dispatch event.

## 4. Reconciler And UI Interaction

- [x] 4.1 Change ledger reconcile 404 handling from delete rows to fail-and-preserve rows.
- [x] 4.2 Stop request observers/session sync on terminal run-level client errors without marking backend health failed.
- [x] 4.3 Handle run dialog/sidebar/task-manager reply, cancel, auth-import, polling, chat, and event failures with request settlement for `400/404/410/422`.
- [x] 4.4 Start SkillRunner workspace observation/recoverable context only after `request-ready`, not after upload-backed `request-created`.

## 5. Tests

- [x] 5.1 Update focused SkillRunner transport, apply seam, reconciler, management client, and UI/task-manager tests.
- [x] 5.2 Run `npx tsc --noEmit`, focused mocha tests, and `git diff --check`.
