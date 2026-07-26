## Why

The plugin currently owns only a short-lived dispatch queue that cannot be inspected or canceled and that exposes backend-facing `queued` state before a task has actually been submitted. Multi-unit ACP Skills and SkillRunner workflow submissions need a distinct Host-owned admission queue so users can preview valid units, choose a per-submission concurrency limit, inspect pending work, and remove work before it reaches any backend.

## What Changes

- Add an in-memory Host workflow submission queue whose entries represent filtered workflow execution units that have not yet been submitted to ACP Skills or SkillRunner.
- Add a workflow-level Host option, `maximum concurrency`, accepting a non-negative integer; blank and `0` mean unlimited, and the normalized option can be saved as the workflow default.
- Resolve the effective concurrency once per submission. Each submission owns an independent FIFO and concurrency count; later settings changes and other submissions do not alter it.
- Hold a concurrency slot until the admitted execution unit reaches terminal execution and finishes required Host apply work. Sequence workflows hold one slot across all steps, including user/auth waits, until the sequence finishes or fails.
- Preview units accepted by availability-phase declarative `validateSelection` filtering once when the submit dialog opens. The preview remains fixed for that dialog and does not invoke workflow preflight, `buildRequest`, provider execution, or apply hooks.
- Add read-only `Queued` sections between `Running` and `Completed` in ACP Skills and SkillRunner task drawers, grouped and collapsible by backend, with Host-only cancel actions.
- Show Host-queued rows in ACP and SkillRunner Dashboard backend tabs with cancel actions while excluding them from Dashboard Home, summary counts, active-task popovers, backend run stores, task history, and completed-task projections.
- Include Host-queued input identities in duplicate-submission detection. Explicit duplicate approval can still enqueue a new unit.
- Remove a canceled pending unit from the Host queue without creating a backend request, run record, terminal task, or history row; account for it as skipped in the owning workflow submission summary.
- Keep the queue in memory only. Plugin shutdown discards pending entries and startup does not restore them.
- Limit this change to workflows submitted through ACP Skills and SkillRunner backends; Generic HTTP and pass-through execution retain their existing behavior.
- **BREAKING**: ACP multi-unit submissions with a blank or `0` maximum concurrency become unlimited instead of inheriting the current frontend-serialized dispatch default. Users can persist `1` to retain serialized submission behavior for a workflow.

## Capabilities

### New Capabilities

- `workflow-host-queue-management`: Defines Host-owned pending workflow units, per-submission admission and completion semantics, cancellation, observable queue projections, backend isolation, and in-memory lifetime.

### Modified Capabilities

- `workflow-execution-seams`: Adds explicit execution-unit planning and Host admission before provider run/apply while preserving aggregate and sequence semantics.
- `workflow-settings-domain-decoupling`: Extends the versioned workflow settings domain with normalized, persistable Host queue options.
- `workflow-settings-single-source-submit-flow`: Adds declarative unit preview and a per-submit/persisted maximum-concurrency control to the submit snapshot.
- `workflow-settings-dialog-model`: Adds Host option and execution-unit preview DTOs and their validation/rendering contract.
- `workflow-duplicate-job-submission-guard`: Treats Host-queued units as duplicate candidates without turning them into active backend tasks.
- `acp-skillrunner-result-apply-and-run-panel`: Adds non-owner queued rows to the ACP Skills task drawer and ACP backend Dashboard view.
- `skillrunner-provider-global-run-workspace-tabs`: Adds the queued drawer section and cancel action without creating selectable SkillRunner run placeholders.
- `assistant-workspace-ui-refresh-governance`: Requires queue-only drawer updates to preserve transcript and unrelated managed-region DOM identity.
- `task-runtime-ui`: Adds backend-tab-only queued rows and explicitly excludes Host-queued entries from Dashboard Home and active-task popovers.

## Impact

- Execution contracts and orchestration under `src/modules/workflowExecution/`, `src/workflows/runtime.ts`, and `src/jobQueue/`.
- Workflow settings parsing, persistence, descriptor construction, and submit dialog host/page code.
- ACP Skills and SkillRunner drawer projections, shared Assistant Workspace drawer rendering/action routing, and region signatures.
- Dashboard snapshot construction, ACP/SkillRunner backend tables, backend-tab actions, and refresh subscriptions.
- Duplicate guard inputs, workflow feedback accounting, runtime logging, localization, component documentation, OpenSpec deltas, and focused execution/UI regression tests.
- This change is implemented after `fix-parameterized-artifact-exclusion-phases`, whose availability-mode selection contract is consumed by the submit preview.
- No new dependency, backend protocol field, persistent queue schema, startup recovery path, Generic HTTP behavior, or pass-through behavior.
