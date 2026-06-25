# Design

## Submission Context SSOT

SkillRunner task/run metadata used by UI and execution follow-up must be complete at submission time. `PreparedWorkflowExecution.skillDisplayById` is the source for skill display metadata. Sequence runtime persists the relevant step display fields into `SequenceRunState.steps[]` so continuation can emit the same metadata without rescanning registries or rebuilding UI fallbacks.

## Sequence Step Metadata

`executeSkillRunnerSequence()` accepts skill display metadata and initializes sequence step state with `skillName`. All step progress events emitted by the sequence runtime include both `sequenceStepSkillId` and `sequenceStepSkillName` when known. `continueSkillRunnerSequence()` uses the persisted sequence state, so initial and continuation steps expose the same event shape.

## Shared Job Construction

A shared SkillRunner submission-context builder constructs sequence step `JobRecord`/`JobRecordMeta` from backend, workflow, sequence, event, and parent/run data. Both `runSeam` and `skillRunnerForegroundContinuation` use the same builder, removing divergent metadata paths.

Continuation-created steps restore the same base submission context as initial steps before calling the shared builder. That context includes provider options, derived engine, execution mode, root input identity, and target parent identity, so interactive foreground apply does not narrow the metadata carried by downstream sequence steps.

Single-job submission continues to enqueue through the queue, but its meta is built from the same submission context helpers for skill display fields.

## UI Boundary

SkillRunner panel, sidebar, dashboard, and run dialog consume `skillName` from task/run projections. They do not scan the skill registry or infer missing display names from `skillId`.
