## Why

Three execution-seam leftovers fail the deletion test: an internal-only export,
and two exported aliases whose deletion moves no complexity into callers.

## What Changes

- Unexport `isBackendBatchFullParallelProvider`.
- Delete `canonicalizeWorkflowResultJson` and call
  `unwrapSkillRunnerResultJson` directly.
- Delete `resolveInputUnitLabelFromRequest` and call
  `resolveTaskNameFromRequest` directly.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workflow-execution-seams`: Seam modules expose one name per concept.

## Impact

- Shrinks three execution-seam interfaces without moving implementation.
- No behavior change and no test setup migration.
