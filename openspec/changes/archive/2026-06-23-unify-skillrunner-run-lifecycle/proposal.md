# Unify SkillRunner Run Lifecycle

## Summary

This change makes `runKey` the local SkillRunner run identity and removes the
architectural split between single SkillRunner jobs and sequence workflow
steps. A sequence step is a first-class SkillRunner run that is associated with
a sequence run and orchestrated by the sequence runtime; it does not use a
separate synthetic job lifecycle.

This change supersedes `tolerate-skillrunner-terminal-failure`. The older
change addressed one narrow symptom: frontend observer failures after request
creation were being written as terminal failures. This change absorbs that
decision into the broader lifecycle model and adds the projection, state
machine, and invariant ownership rules needed to make recovery SSOT-correct.

This round is design-only. It adds OpenSpec artifacts, state-machine SSOT,
YAML invariants, and code drafts, but does not change runtime code.

## Why

SkillRunner currently has two lifecycle paths:

- Single SkillRunner jobs are represented as projectable run records.
- Sequence workflow steps can be represented through synthetic step job
  projection state.

That split is the root of the recovery failure. A long-running sequence step can
already have a backend request id and recoverable backend state, but later
frontend shutdown or transport failure can be observed through the synthetic
path and written as terminal or unprojectable local state. Recovery then scans
the local projection SSOT and has no recoverable row to hand off, even though
the backend request is still running.

The issue is not solved by adding backend-wide recovery scans. Backend scans
would mask a local lifecycle/projection bug and make the backend list a fallback
truth source. The correct fix is to make the local SkillRunner run store the
only lifecycle SSOT and ensure sequence steps are represented by the same run
records as single jobs.

## Goals

- Keep `runKey` as the immutable local SkillRunner run identity.
- Treat `requestId` only as backend correlation that attaches to an existing
  `runKey` after request creation.
- Persist only lifecycle, recovery, and execution facts in
  `SkillRunnerRunRecord`.
- Derive UI display facts from backend, workflow, skill, and sequence SSOT at
  projection time.
- Make sequence steps first-class SkillRunner runs.
- Make observer failures after `requestId` exists recoverable and non-terminal.
- Keep recovery scanning the local SkillRunner run store, not backend-wide run
  lists.
- Lock the model through OpenSpec requirements and YAML invariants.

## Non-Goals

- No runtime implementation in this design round.
- No compatibility layer for old synthetic sequence step records.
- No backend API change.
- No backend-wide recovery fallback.
- No `skillLabel` field in the new lifecycle model; there is no reliable SSOT
  for it.

## What Changes

- Add a runKey-first SkillRunner run lifecycle model.
- Define `SkillRunnerRunRecord` as the persisted minimal model.
- Define `SkillRunnerRunProjection` as the UI/read model with dynamic cascades.
- Define submit phase and lifecycle state machines.
- Define observer failure and terminal ownership rules.
- Define sequence step ownership: sequence runtime orchestrates, SkillRunner run
  lifecycle owns step execution state.
- Define recovery data flow from local run store projections.
- Add YAML invariants for identity, projection, recovery, and terminal ownership.
- Add code drafts for the future runtime seams without applying them now.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `provider-adapter`
- `workflow-execution-seams`
- `task-runtime-ui`
- `task-dashboard-skillrunner-observe`

## Risks

- The runtime implementation will be a breaking refactor because old
  `taskProjection`, `localRunId`, synthetic sequence job fields, and persisted
  display snapshots are intentionally removed from the lifecycle model.
- UI code must be audited carefully so it consumes projections only and does not
  upsert or delete SkillRunner lifecycle truth.
- Recovery correctness depends on every SkillRunner submission path creating a
  run record before backend request creation.
