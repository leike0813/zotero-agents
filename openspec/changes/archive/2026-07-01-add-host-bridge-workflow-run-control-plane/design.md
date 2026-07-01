## Overview

The public control plane uses two handles:

- `workflowRunId`: the existing workflow execution run id, used for orchestration status and workflow-level cancel intent.
- `skillRunId`: an opaque public handle for a concrete skill/backend run, used for read, reply, and connect actions.

Host Bridge never uses `workflowRunId` as an implicit target for reply or connect. Agents discover `skillRunId` values from workflow run status or the active task list.

## Handle Mapping

- ACP skill runs map `skillRunId` to the ACP run `requestId`.
- SkillRunner runs map `skillRunId` to the SkillRunner run `runKey`.
- Generic task projections without a backend run handle use the task-local id for read-only display only and expose no reply/connect actions.
- Sequence workflows expose one skill run per concrete step when the step has a projection, carrying `sequenceStepId`, `sequenceStepIndex`, and `sequenceRole`.

`skillRunId` is opaque. Clients must not parse it or infer provider identity from its format.

## Status And Liveness

Workflow run status aggregates active task runtime rows, dashboard history rows, ACP skill run summaries, and SkillRunner run projections through existing task projection seams.

- `liveness=active` for queued/running/repairing work.
- `liveness=waiting` for `waiting_user` or `waiting_auth`.
- `liveness=failed_retriable` only for ACP runs whose recovery state indicates a recoverable conversation.
- `liveness=terminal` for succeeded, failed, or canceled runs without recovery actions.
- `liveness=unknown` when a run exists but has no actionable projection state.

`currentSkillRunId` is display guidance only. It is chosen from waiting, failed-retriable, active, then most recently updated terminal projections.

## Interaction Semantics

- `workflow cancel` records and forwards a workflow-level cancel intent. It may update local ACP runs or backend runs that support cancellation, but the response does not promise terminal settlement.
- `skill-run reply` requires a `skillRunId` that resolves to an ACP run in a waiting state.
- `skill-run connect` requires a `skillRunId` that resolves to an ACP recoverable run. It only reconnects; it does not send a continuation message.
- Unsupported backend types return stable errors instead of silently no-oping.

## Approval

Workflow cancel uses scoped approval behavior:

- Calls with a matching ACP/SkillRunner scope may proceed without a new global approval prompt.
- Unscoped external calls require Zotero UI approval.
- Read-only status and active task endpoints never require approval.

## Boundaries

This change does not add transcript retrieval, cursor events, watch mode, or task-level cancellation.
