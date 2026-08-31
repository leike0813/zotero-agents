## Why

ACP Skills currently treats a terminal workflow task as if its ACP conversation
must also be terminal. A successful or failed run can retain a resumable ACP
session, but the user cannot reconnect for ordinary follow-up discussion without
re-entering workflow continuation and risking convergence or apply side effects.

## What Changes

- Separate the workflow-task lifecycle from the recoverable ACP conversation
  lifecycle for eligible `succeeded` and `failed` ACP Skills runs.
- Require an explicit Connect before post-terminal Reply and resume only the
  original session without sending a prompt automatically.
- Reuse the existing ACP transport, transcript, permission, timeout, interrupt,
  and disconnect machinery while freezing workflow, result, apply, output,
  sequence, and terminal-error evidence.
- Derive post-terminal eligibility in one classifier without adding a persisted
  run-record flag or changing terminal task status.
- Keep terminal conversations outside submission-slot admission and workflow
  resumption; preserve the existing guarded path for `waiting_user` and
  `failed_retriable`.
- Project connection, reply, activity, and archive availability independently
  from terminal task liveness in Assistant Workspace and Host Bridge.
- Normalize stale terminal conversation activity on startup without altering
  task or apply evidence.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `acp-skills-interactive-execution`: terminal task state and recoverable
  conversation state become orthogonal.
- `acp-skills-session-recovery`: eligible terminal sessions can be explicitly
  reconnected for ordinary conversation.
- `acp-skillrunner-compatible-runner`: ACP Skills terminal replies reuse the
  existing conversation machinery without invoking workflow settlement.
- `assistant-sidebar-ui`: terminal run controls, activity, and archive state are
  projected without moving the run back to active groups.
- `host-bridge-workflow-control`: terminal liveness remains terminal while
  connection and reply actions can be available.

## Impact

- Affected implementation: ACP Skill run store, recovery, persistence,
  orchestrator, task projection, Workspace publication, Host workflow control,
  and sidebar panel modeling.
- Affected tests: existing ACP runner, concurrent submission, Host Bridge,
  Assistant Workspace publication, and UI smoke suites.
- No wire-schema, persisted-schema, endpoint, run-status, dependency, runtime
  prompt, or historical transcript format change.
