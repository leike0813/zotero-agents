## Why

Recent Synthesis KG work made the full Synthesis snapshot much heavier. Existing dashboard, toolbar menu, and workflow settings paths now resolve dynamic workflow parameters by calling the full Synthesis snapshot, so ordinary UI interactions can trigger broad Synthesis KG reads and feel globally slow.

## What Changes

- Add a lightweight Synthesis topic-options read path for workflow parameter resolution.
- Stop workflow menu preflight and dashboard summary rendering from resolving expensive dynamic parameter options.
- Keep full dynamic options resolution only for contexts that actually need editable workflow parameter controls.
- Ensure read-only UI interactions do not trigger full Synthesis Workbench snapshots, projection rebuilds, or background jobs.
- Preserve existing workflow execution and update-topic-synthesis behavior.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `workflow-menu`: workflow menu construction must not run heavyweight dynamic option or Synthesis snapshot reads.
- `workflow-settings-dialog-model`: descriptor construction must support a lightweight mode that omits dynamic options when only summary/configurability state is needed.
- `synthesis-workbench-ui`: Synthesis service must expose a bounded topic-options read path for workflow parameter resolution without building the full Workbench snapshot.

## Impact

- Affected code: `src/modules/workflowParameterOptions.ts`, `src/modules/workflowSettings.ts`, `src/modules/workflowMenu.ts`, `src/modules/taskManagerDialog.ts`, `src/modules/synthesis/service.ts`.
- Affected tests: workflow menu/settings and Synthesis UI performance contract coverage.
- No new dependencies, no schema/stage changes, no Git history changes.
