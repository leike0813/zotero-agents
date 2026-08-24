## Why

`skillrunner.sequence.v1` already has a shared sequence runtime, but externally
completed ACP and SkillRunner steps reconstruct part of the successful-step
transition in their callers. That duplication has allowed recovery ordering,
root completion, cleanup, and final apply ownership to drift from normal
execution.

## What Changes

- Deepen the existing sequence runtime so normal provider success and an
  externally completed step share one successful-step advancement path.
- Keep step execution success and step apply outcome as separate persisted
  facts, preserving `continue` and `fail_sequence` policies.
- Make the runtime own cleanup ordering through an injected lifecycle adapter;
  keep ACP controller operations in the ACP lifecycle module.
- Make externally completed-step acceptance idempotent from persisted sequence
  state and reject conflicting request identities.
- Complete the sequence root before outer workflow apply and use the step that
  actually terminated the sequence to decide whether outer apply is already
  owned by step-level `apply_result`.
- Keep backend submission exactly-once and ambiguous pre-request-id crash
  recovery outside this change.

## Capabilities

### Modified Capabilities

- `workflow-execution-runtime`: shared successful-step advancement, lifecycle
  cleanup barrier, and persisted idempotency.
- `workflow-execution-seams`: root-owned completion and actual-terminal-step
  outer apply ownership across normal and recovered execution.

## Impact

The change affects the shared sequence runtime and state store, ACP sequence
lifecycle integration, normal workflow seams, ACP recovery, SkillRunner
foreground continuation, and their existing focused tests and architecture
documentation. Workflow request schemas and backend protocols do not change.
