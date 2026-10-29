# Design

## Context

See proposal.md for motivation. The only production JobQueue composition is runSeam. Progress currently updates job metadata; the execution callback starts with a shallow job snapshot. Canonical run-store notifications synchronously trigger terminal observation, so moving domain writes ahead of queue result storage could change foreground apply readiness.

## Goals / Non-Goals

**Goals:** one SkillRunner settlement owner; a backend-neutral queue; preserve current execution, projection, identity and recovery behavior.

**Non-Goals:** changing provider protocols or persistence, unifying dispatch/submission queues, rewriting sequence/ACP lifecycle, introducing a scheduler framework, changing UI behavior.

## Decisions

- Export `JobExecutionOutcome` from the existing queue module with `state: JobState`, `result?: unknown`, `error?: unknown`, `metaPatch?: Partial<JobRecordMeta>`. `executeJob` returns it. Preserve the original result object in `job.result`, not the envelope. The queue retains its generic fallback for unexpected executor rejection.
- Add synchronous `onJobSettled(job, outcome)`. Apply the outcome and timestamp before this callback, then emit `onJobUpdated`. Catch settlement callback failures separately; do not reclassify the completed provider execution or call settlement again. The dispatch counter is released in `finally`.
- runSeam wraps provider/sequence execution, reads `queue.getJob(job.id)` at completion for current progress metadata, and returns an explicit outcome. Non-SkillRunner outcomes follow the existing provider result contract. SkillRunner single-job classification and publication live in the existing `skillRunnerRunSettlement` owner, reusing the state machine and recovery helpers. This avoids both queue domain imports and a new shallow policy framework.
- Move SkillRunner progress-to-run event mapping and single/sequence run initialization into that same owner. Keep UI focus, auto-reply hooks, ACP registration and sequence orchestration in runSeam. Keep existing metadata keys and their progress writeback contract.
- Publish exactly the appropriate semantic event for each dispatch: backend result, local submission failure, recoverable observer detachment or terminal run-level error. A generic update never independently translates that into another canonical event. Preserve the existing public `settleSkillRunnerRunAsFailed` API used by other consumers.
- Keep terminalResolution synchronous and read-only. Preserve local-ready versus canonical-ready and the existing foreground apply/slot-admission behavior, including canonical termination before late provider completion.

## Risks / Trade-offs

- Premature terminal observation → verify that public store subscribers can read the completed raw queue result and that apply/slot release remain once-only.
- Progress snapshot becomes stale → classify using the current queue record, preserving typed and extension metadata.
- Existing provider documentation conflicts with newer execution requirements → correct the three related clauses in this change using current code and foreground execution specs.
- Internal callback contract changes → update all direct constructors and test fixtures; preserve external backend and persistent contracts.

## Migration Plan

No runtime data migration or dependency changes. Land the queue/adapter/domain changes together with their callers and behavioral tests. A source revert restores the previous implementation without transforming persisted data. Keep the independent Topic Synthesis change untouched. Plugin build and real-host E2E are not part of the localized Node validation scope.
