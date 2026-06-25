# Design: SkillRunner Request-Ready Settlement Governance

## Lifecycle Boundary

SkillRunner dispatch has two local phases before backend execution becomes
visible:

1. `request-created`: `/v1/jobs` returned a backend request id.
2. `request-ready`: upload and request initialization completed successfully.

`request-created` is audit-only. It may appear in runtime logs and diagnostics,
but it must not create a user-visible task projection. If create/upload fails or
times out before `request-ready`, the workflow job fails in the foreground with a
request-scoped log/toast and no visible SkillRunner run.

`request-ready` is the first visible point. The provider writes a projectable
SkillRunner run record, registers it for settlement, and returns a deferred
provider result. From that point onward, provider foreground execution must not
poll `/v1/jobs/{id}`, fetch `/result`, fetch `/bundle`, or apply host-side
effects.

## Reconciler Ownership

`SkillRunnerTaskReconciler` owns all post-ready state transitions:

- backend state polling and terminal confirmation
- terminal run-level `400/404/410/422` settlement
- terminal success result or bundle fetch
- SkillRunner response normalization, including `responseJson.data`
- namespaced result path lookup, including `result/<skillId>.<n>/result.json`
- deferred apply execution
- retry scheduling and `nextRetryAt`
- sequence step continuation

Transient transport failures, timeouts, `5xx`, and `429` may enter backoff or
backend-health handling, but they must not block later submit-lane work.
Run-level `400/404/410/422` settles only the affected run as failed and must not
mark the backend unreachable.

## Run State And Apply State

Run lifecycle and apply lifecycle are separate fields.

Run state:

- `request_ready`
- `queued`
- `running`
- `waiting_user`
- `waiting_auth`
- `succeeded`
- `failed`
- `canceled`

Apply state:

- `idle`
- `pending`
- `running`
- `succeeded`
- `failed`
- `skipped`

A terminal successful run may still have `apply=pending`, `apply=running`, or
`apply=failed`. Such runs remain visible in Dashboard, popover, and RunDialog
until the projection rules intentionally archive them. They must not disappear
just because backend execution succeeded.

Host-side failures have explicit landing zones:

- retryable fetch/network failure: apply retry state with `nextRetryAt`
- parse/schema/namespaced result failure: visible failed apply
- missing bundle artifact: visible failed apply
- apply hook or Host Bridge failure: visible failed apply
- store write failure: runtime log and toast; if the store is writable, record a
  failed or retryable settlement state

## Sequence Continuation

SkillRunner sequence root records are orchestration-only and not projectable.
Each step is a separate projectable SkillRunner run.

Step 0 starts a new backend workspace. Step N reuses the previous successful
step's backend `request_id` as the workspace handle.

When a step reaches terminal success, the reconciler first fetches and
normalizes result data, then computes the step output and handoff projection.
The sequence may continue to the next step as soon as execution/result/handoff
requirements are satisfied. Deferred apply is a side effect owned by the
reconciler and must not block continuation.

If handoff projection fails, the sequence stops only when the next step
explicitly requires that failed handoff. Otherwise, the sequence continues using
workspace reuse and records the handoff/apply error visibly.

## ACP Boundary

ACP Skills keep their foreground conversation/apply model. SkillRunner request
ids must never create or update ACP `skill-runs` records. Shared helpers may
normalize result shapes or compute workflow projections, but persistent state and
apply ownership remain backend-specific.
