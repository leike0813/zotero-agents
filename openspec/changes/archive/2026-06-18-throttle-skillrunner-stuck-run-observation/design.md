## Context

SkillRunner observation currently has several independent loops:

- provider foreground polling after `/v1/jobs`;
- task ledger/recoverable-context reconciliation;
- session event sync using `events/history -> events SSE`;
- UI observer loops for run dialogs and sidebar workspace.

When a backend run remains `queued` or returns unchanged non-terminal state, these loops can keep issuing frequent requests. The backend may be healthy enough to answer quickly, so a poll loop that resets its timeout on every response can run indefinitely. In parallel, the reconciler and session sync manager may repeatedly start observation for the same request, causing dense `/events/history` traffic even though no new state is available.

There is also a pre-ready edge: after `/v1/jobs` returns `request_id`, upload can stall or fail before `request-ready`. The frontend intentionally does not create the visible run UI at `request-created`, but request ledger or recoverable bookkeeping can still contain the request id. If session sync is started from that partial context, the plugin can flood `/events/history` for a task that is not visible in the task list.

## Goals / Non-Goals

**Goals:**

- Bound foreground provider polling by a fixed elapsed deadline.
- Add per-request cadence/backoff for unchanged non-terminal reconcile contexts.
- Avoid repeatedly starting event-session sync for long-unchanged `queued` runs.
- Prevent pre-ready or locally invisible SkillRunner requests from starting event-session sync.
- Keep `running` and `waiting_*` runs responsive enough for user-visible interaction.
- Preserve task rows and dashboard visibility for stuck non-terminal runs.
- Preserve backend health gating only for backend-level failures.

**Non-Goals:**

- Do not decide why the backend leaves a run `queued`.
- Do not change the SkillRunner backend HTTP protocol.
- Do not change terminal run-level `400/404/410/422` settlement rules.
- Do not alter ACP SkillRunner-compatible recovery semantics.
- Do not hide or delete stuck tasks from local history.

## Decisions

### Decision 1: Use fixed provider poll deadlines

`executePollStep()` should capture one `startedAt`/deadline for the whole poll operation. Any `queued`, `running`, or waiting response checks that deadline before sleeping and continuing. A quick successful non-terminal response must not reset timeout accounting.

Alternative considered: rely only on reconciler backoff. That would not cover foreground dispatch calls that are still inside provider polling before reconciler ownership starts.

### Decision 2: Reconciler cadence is request-local and state-aware

The reconciler should store lightweight per-request observation metadata, such as last observed backend status, last observation time, and next allowed reconcile time. If the backend status and important interaction markers are unchanged, the next reconcile interval grows up to a bounded maximum. When state changes, terminal settlement occurs, a waiting state appears, or an error path changes ownership, the cadence resets.

Alternative considered: one global poll interval. That would punish active requests and still allow a single stuck request to consume every global tick.

### Decision 3: Long queued runs do not keep event sync hot

Event sync should remain running-oriented. A freshly ready request may get a short initial observation window, but a request that is still `queued` and unchanged after that window should not repeatedly run `events/history -> events SSE`. Once it transitions to `running` or `waiting_*`, session sync may start again.

Alternative considered: keep event sync active for all non-terminal states and only back off errors. That fails for the observed case because the backend can answer successfully while the run is still stuck.

### Decision 4: Session sync requires ready and visible ownership

`request-created` is only a dispatch ownership marker. It is not sufficient to open UI, create recoverable observation, or start event/session sync. Session sync must require either a persisted post-upload `request-ready` recoverable context or an active/history task projection that is user-visible and has `backendId + requestId`. If that visible/ready owner is missing, the request can remain in ledger for dispatch recovery, but it must not drive `/events/history`.

Alternative considered: create a hidden task row at `request-created` so all request ids are visible. That would surface tasks before upload success and conflict with the existing upload-success observation boundary.

### Decision 5: Throttling is not backend health failure

Backoff caused by unchanged run state is not a backend reachability signal. Network failures, timeouts, `429`, and `5xx` keep existing recoverable/backend-health semantics. A locally throttled request remains visible as non-terminal and cancelable when the UI supports cancellation.

## Risks / Trade-offs

- [Risk] A queued run may transition quickly after the observation window and the UI may show the change with a short delay. -> Mitigation: keep the initial cadence responsive and reset backoff on any state change.
- [Risk] Event-only state changes for a queued run might be delayed if event sync is cold. -> Mitigation: only cold-throttle long-unchanged queued runs; running/waiting states remain session-sync eligible.
- [Risk] Pre-ready runs may have backend events that are not consumed. -> Mitigation: pre-ready upload is not user-observable by design; after `request-ready`, normal visible ownership and initial observation resume.
- [Risk] More per-request metadata can drift from persisted context shape. -> Mitigation: treat cadence fields as optional and default missing values conservatively on restore.
- [Risk] Tests could lock internal timings too tightly. -> Mitigation: assert stable behavior classes: deadline respected, unchanged queued is not observed every tick, state change resets cadence.

## Migration Plan

- Add optional cadence fields with safe defaults for existing persisted contexts.
- Existing stuck tasks remain visible and continue through the new throttled reconcile path.
- Rollback is limited to reverting frontend code and this OpenSpec change; no data migration is required.

## Open Questions

- Exact initial, maximum, and reset intervals should be selected during implementation based on existing constants and test ergonomics. The design requires bounded backoff, not a specific numeric schedule.
