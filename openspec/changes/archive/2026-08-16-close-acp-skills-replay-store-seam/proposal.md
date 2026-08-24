## Why

ACP Skills replay still mutates the skill-run store through four
replay-specific entry points, bypassing the standard permission queue and
timer-inspection ownership. The ACP Chat replay seam was closed in the previous
change; this change closes the smaller ACP Skills store seam without routing
replay through full skill execution.

## What Changes

- Remove `prepareSyntheticAcpSkillRunReplay`,
  `applySyntheticAcpSkillRunReplayPermission`,
  `cleanupSyntheticAcpSkillRunReplay`, and
  `inspectSyntheticAcpSkillRunReplayTimers`.
- Route replay permission events through the standard ACP Skills permission
  queue.
- Add a generic hard-delete store API for replay cleanup.
- Rename the workspace-data-plane timer inspector to a generic seam.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `acp-runtime-replay-profiler`: ACP Skills replay uses standard permission,
  timer, and record-deletion seams.
- `acp-skills-interactive-execution`: Generic record deletion preserves
  selection and workspace-change semantics.

## Impact

- Removes four replay-specific exports from the ACP skill-run store surface.
- Updates `acpRuntimeReplayTargets`, `acpRuntimeReplayProductionPorts`,
  `acpSkillRunWorkspaceDataPlane`, and the runtime diagnostics manifest.
- Extends the existing logical-time replay test suite; no new test file.
- Does not execute skills, create workspaces, or materialize skills during
  replay.
