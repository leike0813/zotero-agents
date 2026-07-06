## Context

`skillrunner.sequence.v1` creates one root workflow job and then executes
ordered concrete provider step runs. The root job is an orchestration carrier:
it owns `SequenceRunState`, final step selection, handoff state, continuation,
and apply semantics. It is not itself an ACP skill run, SkillRunner request, or
Dashboard task.

SkillRunner already mostly follows that model because sequence step progress is
projected through `SkillRunnerRunStore` and the root job is skipped before
taskRuntime/history writes. ACP does not: the root job still reaches
`recordWorkflowTaskUpdate()` and `recordTaskDashboardHistoryFromJob()`, while
each ACP step also creates an `AcpSkillRunRecord`. That is the source of the
parent/child double active row.

## Decisions

### Sequence state has an orchestration owner

`SequenceRunState` will persist in a new provider-neutral store backed by
`plugin_workflow_sequence_runs`. Provider run tables are no longer sequence
state carriers. The persisted payload schema remains
`workflow.sequence.state.v2`; only the table owner changes.

Old provider-table sequence root entries are migrated once by scanning
`plugin_acp_skill_runs` and `plugin_skillrunner_runs` for sequence envelopes or
`sequence:<workflowRunId>` run keys. Migration inserts the parsed state into the
workflow sequence store and deletes the old provider entry. After that,
sequence state reads never fall back to provider run tables.

### Provider run stores express concrete runs only

ACP and SkillRunner stores remain separate because their provider-specific
state machines, recovery semantics, and action surfaces differ. Both stores
will only contain concrete single runs or sequence step runs.

Sequence step identity is shared:

- Single run: no `sequenceStepId`; `runId` is the workflow run id.
- Sequence step: `sequenceStepId` is set; `runId` is
  `SequenceRunState.workflowRunId`; `jobId` is
  `<sequenceJobId>:<sequenceStepId>`.
- `sequenceFinalStepId` is carried with step progress and stored on concrete
  provider records when known.

Derived DTOs may expose `sequenceRole: "single" | "sequence_step"`, but role is
not persisted. It is derived from `sequenceStepId`.

### Projectability is a write-side policy

The sequence root is not written to taskRuntime or Dashboard history. This is
enforced in the execution seam and in the task/history write helpers so future
call sites cannot accidentally reintroduce root rows.

Read projections should not need normal-path root filtering because their
inputs are already projectable. Legacy cleanup may delete older root rows, but
that is a data cleanup path rather than a correctness mechanism for new data.

### Host Bridge separates workflow root from skill runs

Workflow run status reads root orchestration state from
`WorkflowSequenceRunStore` when the requested id is a sequence run id. The
`skillRuns[]` list is built from sequence steps plus concrete ACP/SkillRunner
provider run stores. The root workflow id is accepted for workflow-level cancel,
but it is not accepted as a skill-run id for reply/connect/cancel operations.

## Risks

- Existing persisted sequence root entries must be migrated before provider
  run store hydration, otherwise old roots may still appear as provider runs.
- Host Bridge workflow status must include sequence-only runs even when
  taskRuntime has no root row.
- Tests must assert structured identity and liveness fields rather than UI
  text, because this change is model-level.

## Migration

The migration is a move, not a fallback:

1. Parse legacy sequence envelopes from ACP and SkillRunner provider run tables.
2. Upsert them into `plugin_workflow_sequence_runs`.
3. Delete the legacy provider run entries and associated provider run events.
4. Use only the workflow sequence store for subsequent reads.
