## Context

ACP Skills run status is consumed by the store, orchestrator, assistant panel,
dashboard, toolbar, Host Bridge workflow control, workflow task projection, and
sequence runtime. Before this change, the implementation allowed one status
value to carry two incompatible meanings: terminal `failed` for retention and
projection, and recoverable `failed` for reconnect/auto-continuation.

That ambiguity caused user-visible drift. A recoverable failed run could keep
showing as failed while backend recovery had already resumed. Separately,
task-level cancellation and current-turn interrupt shared enough downstream
handling that `Cancel Task` during live prompting could settle as
`waiting_user`, which is only valid for current-turn interrupt.

## Goals / Non-Goals

**Goals:**

- Establish ACP Skills run status as a single explicit state machine.
- Represent recoverable prompt/session failure as non-terminal
  `failed_retriable`.
- Make terminal `succeeded`, `failed`, and `canceled` absorbing at write
  boundaries.
- Preserve legacy recoverable persisted runs through lazy normalization.
- Keep task-level cancellation and current-turn interrupt semantically
  separate.
- Align projections and Host Bridge liveness with ACP run status without
  expanding the lower-level workflow `JobState` enum.

**Non-Goals:**

- Do not redesign the ACP adapter protocol.
- Do not add one-time persistence migration scripts.
- Do not introduce a new workflow queue `JobState`.
- Do not change the old SkillRunner provider state machine except where ACP
  SkillRunner-compatible projections depend on ACP run status.

## Decisions

### Decision: Add `failed_retriable` instead of overloading `failed`

`failed` remains an absorbing terminal state. Recoverable prompt/session
failures move to `failed_retriable`, which is active and recoverable.

Alternative considered: keep `failed` and infer recoverability from
conversation/recovery axes. That was rejected because projections, retention,
active summaries, and reconnect eligibility were already interpreting `failed`
differently, and the ambiguity was the root cause.

### Decision: Put status classification and transition validation in the store

The store owns persistence, hydration, summaries, cancellation, reply entry, and
workflow task synchronization. Placing helpers and transition guards there makes
the state machine the write-layer SSOT instead of leaving each caller to
remember allowed transitions.

Alternative considered: validate only in the orchestrator. That was rejected
because UI, Host Bridge, tests, and fixture paths can also touch run records or
their projections.

### Decision: Require status transition reasons for production writes

Production status writes must include a transition reason. This makes illegal
transitions fail at the point of mutation and makes future drift easier to
audit. Tests that need historical states use dedicated fixture helpers instead
of weakening production validation.

Alternative considered: allow optional reasons and validate best-effort. That
would keep the same class of hidden status writes that caused the drift.

### Decision: Use lazy normalization for legacy `failed` records

Hydration/normalization upgrades legacy recoverable `failed` records to
`failed_retriable` when the persisted record is not archived or removed, has a
session id, and the recovery axes still indicate retryability. Unavailable or
unsupported sessions remain terminal `failed`.

Alternative considered: add a one-time migration. That would add operational
surface without improving runtime correctness, because ACP run records are
already normalized at read boundaries.

### Decision: Keep `JobState` unchanged

`failed_retriable` is an ACP Skills run status and liveness concept. Workflow
task rows and Host Bridge task handles continue mapping to existing workflow
states such as `running` or `waiting_user`, while ACP summary status and action
flags expose failed-retriable recoverability.

Alternative considered: add a workflow queue `failed_retriable` state. That
would broaden the protocol and UI compatibility surface beyond the bug fix.

### Decision: Split task cancellation from current-turn interrupt

Task-level `Cancel Task` writes terminal `canceled` for non-terminal runs. The
composer cancel/interrupt action only stops the current ACP prompt turn and
settles as `waiting_user`, so the user can reply and continue.

Alternative considered: keep one downstream cancel path and inspect UI origin
late. That is fragile because adapter prompt outcomes arrive asynchronously and
need an explicit cancellation intent to classify them correctly.

## Risks / Trade-offs

- [Risk] Older tests or fixtures that wrote status directly may fail under
  strict transition validation. → Mitigation: use explicit fixture helpers for
  historical states and keep production writes reasoned.
- [Risk] A recoverable legacy `failed` record may be misclassified if persisted
  recovery axes are incomplete. → Mitigation: normalize only when session and
  recovery evidence indicate retryability; otherwise preserve terminal
  `failed`.
- [Risk] Projection code can drift again if it checks raw status strings. →
  Mitigation: active, terminal, recoverable, retention, and summary filters use
  shared classifiers.
- [Risk] Host Bridge clients may expect a terminal failed task row for old
  recoverable failures. → Mitigation: preserve `JobState` compatibility and
  expose recoverability through ACP summary status, liveness, and action flags.

## Migration Plan

1. Ship the new status value and store classifiers together.
2. Normalize persisted records lazily during hydration and summary projection.
3. Keep `JobState` and public workflow task enums unchanged.
4. Verify impacted ACP Skills, dashboard, toolbar, Host Bridge, sequence, and
   session manager tests.
5. If rollback is required, code must first stop writing `failed_retriable` and
   then treat existing `failed_retriable` records as recoverable active records
   during downgrade cleanup.

## Open Questions

- None for the current change. A future change may decide whether Host Bridge
  should expose a first-class public failed-retriable state instead of only ACP
  summary liveness/action flags.
