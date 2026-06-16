## Why

SkillRunner requests that already have a `requestId` can still fail during upload, initial state fetch, polling, or later interaction. The plugin currently treats every post-create dispatch failure as recoverable, so a backend-rejected run can keep spawning UI requests, hit repeated 404s, disappear from the local task ledger, and leave the user without a cancellable task.

## What Changes

- Classify SkillRunner run-level client errors (`400`, `404`, `410`, `422`) as terminal for the affected request when a `backendId + requestId` is known.
- Preserve existing recoverable behavior for network failures, timeouts, `5xx`, and retryable backend outages.
- Settle rejected or missing SkillRunner runs into a visible local `failed` task/dashboard projection instead of deleting task rows.
- Stop run observers, session sync, and interaction actions for terminal missing/rejected runs.
- Keep frontend skill package schema preflight unchanged; backend validation remains authoritative.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `provider-adapter`: SkillRunner post-create run-level client errors are terminal request failures, not recoverable dispatch failures.
- `task-dashboard-skillrunner-observe`: SkillRunner observation and interaction surfaces stop per-run retries after terminal run-level client errors without gating the whole backend.
- `task-runtime-ui`: SkillRunner ledger reconciliation preserves missing/rejected request projections as failed history instead of deleting them from the UI.

## Impact

- Affected code: SkillRunner provider/client, management client, job queue recoverability, task reconciler, session sync manager, run workspace/dialog, task manager dialog, task/dashboard projection helpers.
- Affected tests: SkillRunner transport fallback, apply seam risk regression, task reconciler, management client, and run UI/task manager behavior tests.
- Public protocol impact: none. Backend API shape and workflow request schema remain unchanged.
