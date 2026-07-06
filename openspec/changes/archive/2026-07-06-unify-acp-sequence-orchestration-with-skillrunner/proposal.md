## Why

ACP `skillrunner.sequence.v1` runs currently leak the sequence root workflow
into provider-facing task projections while concrete ACP step runs are also
projected. Dashboard and Host Bridge then see two active rows for one sequence:
the orchestration parent and the actual step run.

This needs to be fixed at the model boundary, not by adding read-side filters:
sequence roots are workflow orchestration state, while ACP and SkillRunner run
stores should only contain concrete provider runs.

## What Changes

- Add provider-neutral workflow sequence run persistence for
  `SequenceRunState`.
- Move existing sequence root state out of ACP and SkillRunner provider run
  stores into the workflow sequence store during startup/read hydration.
- Treat `skillrunner.sequence.v1` root jobs as non-projectable for taskRuntime,
  Dashboard history, ACP run store summaries, SkillRunner projections, and Host
  Bridge skill-run handles.
- Give ACP sequence steps the same concrete run identity shape as SkillRunner
  sequence steps: workflow run id as `runId`, `<sequenceJobId>:<stepId>` as
  `jobId`, and explicit sequence step metadata.
- Keep ACP and SkillRunner provider run stores separate; each remains
  authoritative only for concrete provider runs.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `workflow-execution-runtime`: sequence state ownership moves to a
  provider-neutral workflow sequence store.
- `workflow-execution-seams`: sequence root jobs are not projectable workflow
  task rows, regardless of provider backend.
- `acp-skillrunner-compatible-runner`: ACP sequence steps are concrete ACP run
  records with SkillRunner-compatible sequence identity metadata.
- `task-runtime-ui`: Dashboard active/history inputs contain only projectable
  task rows and concrete provider run projections.
- `host-bridge-workflow-control`: workflow status reads sequence root state
  from the orchestration store and exposes only concrete provider runs as
  skill-run handles.

## Impact

- Affects workflow sequence persistence, plugin state schema, run seam
  lifecycle callbacks, ACP foreground registration, ACP summaries, task
  runtime/history projection, Dashboard active task mapping, and Host Bridge
  workflow control.
- Adds one SQLite table plus matching memory adapter support. No dependency or
  UI copy change is required.
