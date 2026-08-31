## Why

Sequence workflows can be reported as successful as soon as a non-final step settles, which emits the finish toast too early and abandons the real final result before workflow apply. In ACP Skills this leaves a validated final result indefinitely visible as running with apply still pending until recovery reconnects the run.

## What Changes

- Make the sequence root the exclusive owner of workflow terminal settlement for ACP and SkillRunner backends.
- Prevent non-final step execution or apply success from settling the parent workflow or emitting its finish summary.
- Run the outer workflow apply once after the sequence root completes, including when the ACP final output required repair.
- Preserve root failure, cancellation, and short-circuit completion semantics without backend-, workflow-, or skill-specific branches.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workflow-execution-seams`: Require root-owned sequence terminal observation, apply, and workflow summary settlement across ACP and SkillRunner execution.

## Impact

- Affects workflow terminal observation and provider-terminal resolution in `src/modules/workflowExecution`.
- Adds focused workflow seam regression coverage and updates the execution-seam architecture document.
- Does not change public APIs, persistence formats, workflow manifests, or ACP output-repair behavior.
