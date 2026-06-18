## Ownership Model

SkillRunner and ACP sequence execution share the same workflow request shape, but
they do not share terminal apply ownership.

- ACP-backed sequence steps may execute foreground step apply because ACP skill
  runs already own ACP run-store state.
- SkillRunner-backed sequence steps must use the same terminal ownership as
  ordinary SkillRunner auto jobs: the foreground path records the step request
  and recoverable context; `SkillRunnerTaskReconciler` later observes terminal
  success, fetches result material, executes step apply, and settles state.

## SkillRunner Sequence Terminal Flow

For a SkillRunner sequence step request:

- `request-created` records the step request id.
- `request-ready` records/refreshes a recoverable context keyed by the step job.
- If provider execution returns `deferred`, the sequence parks until the
  reconciler observes a terminal backend state.
- If provider execution returns `succeeded`, foreground sequence runtime records
  the step output but still does not execute step apply for SkillRunner; the
  reconciler remains the owner of apply and completion settlement.

When the reconciler sees terminal success for a sequence step, it must:

- fetch `/bundle` or `/result` according to the step context;
- resolve the step `result.json` using the SkillRunner namespace result path
  before legacy fallback;
- record the step output in sequence state;
- execute the step `apply_result` only when declared;
- record apply success/failure in sequence state;
- continue to the next step only after the step apply is settled or configured
  to continue after failure.

## ACP Store Guard

ACP run-store apply state is only valid for ACP skill runs. Apply-result helpers
must not create ACP run rows from arbitrary request ids. Unknown request ids are
ignored unless they are created by the ACP execution path before apply result is
recorded.

## Completion Semantics

SkillRunner sequence roots may finish foreground execution with pending
reconciler-owned step work. This must be represented as pending/deferred
workflow completion, not as an apply failure. Terminal toasts and final workflow
summary are emitted only after reconciler settlement.
