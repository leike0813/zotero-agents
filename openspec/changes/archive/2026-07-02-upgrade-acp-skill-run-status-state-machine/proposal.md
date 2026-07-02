## Why

ACP Skills run status had drifted from the documented state-machine intent. In
particular, `failed` was treated as both terminal and recoverable: projections
and retention classified it as terminal, while recovery paths could still
reconnect and continue the same backend session. This made failed-retriable
runs remain visibly failed even after reconnect/auto-continuation had resumed.

The same drift also blurred task-level cancellation and current-turn interrupt
semantics. During live prompting, a task-level `Cancel Task` intent could be
settled like an interrupted turn and move the run to `waiting_user`, requiring a
second cancel before the run became terminal.

## What Changes

- Add `failed_retriable` as the non-terminal ACP Skills run status for
  recoverable prompt/session failures.
- Make `succeeded`, `failed`, and `canceled` write-layer absorbing terminal
  statuses.
- Centralize ACP Skills run status classification and transition validation in
  the store layer.
- Lazily normalize legacy persisted `failed` records with recoverable sessions
  into `failed_retriable`.
- Split task-level cancellation from current-turn interrupt handling so
  `Cancel Task` always reaches `canceled` for non-terminal runs, while composer
  interrupt remains `waiting_user`.
- Update recovery, dashboard, toolbar, Host Bridge, assistant panel, and
  workflow projection behavior to treat `failed_retriable` as active and
  recoverable without adding a new `JobState`.
- Preserve `running`, `waiting_user`, `repairing`, and `failed_retriable`
  across recoverable disconnect/hard-timeout paths instead of folding them into
  terminal `failed` or unrelated active states.

## Capabilities

### Modified Capabilities

- `acp-skillrunner-compatible-runner`: ACP Skills run status state machine,
  cancellation, recovery, workflow projection, and UI task visibility.
- `acp-skills-session-recovery`: reply/reconnect eligibility for recoverable
  sessions.
- `host-bridge-workflow-control`: active task and skill-run liveness projection
  for failed-retriable ACP runs.

## Impact

- Affects:
  - `doc/acp-skills-state-machine-ssot.md`
  - `src/modules/acpSkillRunStore.ts`
  - `src/modules/acpSkillRunnerOrchestrator.ts`
  - ACP Skills assistant panel/dashboard/task projection modules
  - Host Bridge workflow control projection
  - ACP SkillRunner-compatible sequence/apply runtime paths
  - ACP run status, recovery, cancellation, and projection tests
- No protocol expansion for `JobState`; `failed_retriable` is expressed in ACP
  Skills run summaries and Host Bridge liveness/action projections.
