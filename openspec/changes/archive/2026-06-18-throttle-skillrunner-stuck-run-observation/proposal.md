## Why

SkillRunner runs that remain `queued` or otherwise unchanged for a long time can trigger dense plugin-side observation loops against `/v1/jobs/{request_id}` and `/events/history`. A worse edge case exists when `/v1/jobs` has returned a `request_id` but upload has not completed or the local task projection is not yet visible: the frontend can still know the backend request exists and start event observation for a task the user cannot see or cancel.

When the backend is slow, stuck, or internally wedged, the frontend should remain observable without amplifying the backend problem or flooding local runtime logs. When the frontend has not crossed the ready/visible boundary, it must not start run event observation at all.

This change bounds polling and event-session observation for unchanged non-terminal SkillRunner runs while preserving existing recovery semantics for real network, timeout, `429`, and `5xx` backend availability failures.

## What Changes

- Add explicit timeout accounting to SkillRunner provider polling so quick `queued` or `running` responses cannot reset the poll deadline indefinitely.
- Add per-request reconcile cadence/backoff for unchanged non-terminal SkillRunner contexts.
- Prevent long-unchanged `queued` requests from repeatedly starting state event sync loops.
- Require SkillRunner event/session observation to be gated by a local visible task projection or a post-upload `request-ready` context, not merely by the existence of a backend `request_id`.
- Keep `running`, `waiting_user`, and `waiting_auth` observation responsive enough for interactive runs.
- Preserve backend health gating for backend-level failures only; throttling unchanged runs MUST NOT mark the backend unreachable.
- Do not change backend protocol, backend queued semantics, or terminal error settlement behavior from existing SkillRunner hardening.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `provider-adapter`: SkillRunner provider polling must use bounded elapsed time and classify timeout/recoverable cases consistently.
- `task-dashboard-skillrunner-observe`: Dashboard/run workspace observation must not start event-session sync for pre-ready or locally invisible SkillRunner requests, and must not repeatedly open event-session sync for long-unchanged queued runs.
- `task-runtime-ui`: Task reconcile must preserve visible non-terminal rows while applying bounded cadence/backoff for unchanged SkillRunner requests, and must not create invisible observer-only tasks.

## Impact

- `src/providers/skillrunner/client.ts`: provider poll loop timeout and recoverable error behavior.
- `src/modules/skillRunnerTaskReconciler.ts`: request-level reconcile cadence, unchanged-state tracking, and session sync entry gating.
- `src/modules/skillRunnerSessionSyncManager.ts`: optional defensive start/backoff behavior for state event sync loops.
- Workflow task projection and recoverable-context paths that currently distinguish `request-created` from `request-ready`.
- Focused tests around SkillRunner client polling, task reconciler cadence, and session sync entry behavior.
