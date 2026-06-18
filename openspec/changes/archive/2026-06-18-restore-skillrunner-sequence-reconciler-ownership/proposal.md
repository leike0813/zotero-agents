## Why

SkillRunner auto runs have a reconciler-owned terminal apply model: foreground
workflow execution records recoverable/pending context, then
`SkillRunnerTaskReconciler` fetches terminal results, executes `applyResult`, and
settles workflow completion.

The sequence protocol work correctly made SkillRunner sequence frontend
orchestrated and step-based, but it also let SkillRunner steps reuse the ACP
foreground step apply path. That breaks the SkillRunner ownership boundary and
can create ACP skill-run records for SkillRunner request ids.

## What Changes

- Keep SkillRunner sequence step request/workspace/result/task projection
  behavior.
- Split sequence apply ownership by backend type:
  - ACP sequence keeps foreground step apply and ACP run-store updates.
  - SkillRunner sequence delegates terminal step apply to
    `SkillRunnerTaskReconciler`.
- Prevent ACP run-store pollution from SkillRunner request ids.
- Ensure SkillRunner sequence completion/toasts wait for reconciler settlement
  instead of treating missing foreground step apply as an unknown failure.

## Capabilities

### Modified Capabilities

- `provider-adapter`
- `task-dashboard-skillrunner-observe`
- `task-runtime-ui`

## Impact

- `src/modules/workflowExecution/sequenceRuntime.ts` and `runSeam.ts`: route
  foreground step apply only for ACP-backed sequence execution.
- `src/modules/skillRunnerTaskReconciler.ts`: own SkillRunner sequence terminal
  result fetch, step apply, sequence continuation, and deferred completion.
- `src/modules/acpSkillRunStore.ts` and sequence apply helpers: reject accidental
  ACP apply state writes for non-ACP request ids.
- Sequence/reconciler tests: cover SkillRunner reconciler-owned apply and ACP
  pollution guard.
