## Context

SkillRunner has multiple observers for the same backend request: provider
foreground polling, foreground continuation, dashboard/workspace status sync,
and request lifecycle bookkeeping. The current state-machine SSOT defines
`SkillRunnerRunStore` as the local projection source, but RunDialog metadata
sync currently reads `/v1/jobs/{request_id}` without applying the returned
status. The job queue also treats any post-create request id as recoverable,
which incorrectly covers upload failures that happen before `request-ready`.

## Goals / Non-Goals

**Goals:**

- Converge every jobs endpoint terminal or waiting observation through the run
  store, workflow task state, and dashboard history.
- Fail pre-ready create/upload failures visibly and avoid registering them as
  recoverable observer-owned work.
- Keep terminal failed/canceled provider results from fetching result material
  or running workflow apply.

**Non-Goals:**

- Redesign SkillRunner backend state names or add new backend statuses.
- Move result/bundle normalization out of provider and foreground continuation
  ownership.
- Change ACP Skills run semantics.

## Decisions

### Jobs observations use the existing management-status convergence path

RunDialog `syncRunMeta()` will parse `client.getRun()` response status and
error fields with `resolveSkillRunnerManagementResponseSemantic()`, then call
`applyManagementStatusToRunDialogEntry()`. This avoids a second UI-specific
mapping table and preserves the existing fan-out to task state and dashboard
history.

Alternative considered: update only the RunDialog session state. Rejected
because it would keep the dashboard and task runtime split from the workspace.

### Recoverability starts at request-ready

The queue manager will preserve recoverable observer failures only after
`request-ready`. Failures before that boundary settle the local workflow job and
run store as failed, even if the backend returned a temporary request id.

Alternative considered: keep all post-create request ids recoverable. Rejected
because upload-backed temporary jobs are not visible ready tasks and can create
invisible stuck observers.

## Risks / Trade-offs

- [Risk] Some backend requests may continue running after a pre-ready local
  failure. -> Mitigation: the local workflow did not reach ready ownership, so
  the plugin fails the visible task and avoids background observer loops.
- [Risk] RunDialog jobs sync could race with an active chat stream. ->
  Mitigation: terminal/waiting convergence uses existing observer generation
  checks and stops stream/session sync after applying the state.

## Migration Plan

No persistent schema migration is required. Existing stuck rows will converge on
the next jobs status observation or foreground continuation attempt.

## Open Questions

None.
