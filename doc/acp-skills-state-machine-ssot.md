# ACP Skills State Machine SSOT

This document is the single source of truth for ACP Skills run controls and
their state semantics.

## State Axes

ACP Skills has five related but separate state axes:

- Run status: overall job progress (`AcpSkillRunStatus`).
- Conversation state: local ACP conversation attachment lifecycle
  (`AcpSkillRunConversationState`).
- Recovery state: session recovery availability and progress
  (`AcpSkillRunRecoveryState`).
- Connection action state: connection-level action tracking
  (`AcpSkillRunConnectionActionState`).
- Reply state: ACP prompt-call round state (`AcpSkillRunReplyState`).

Additionally, when the run is a sequence step, the parent
`skillrunner.sequence.v1` orchestration state applies as a separate axis
(defined by `doc/skillrunner-sequence-recovery-state-machine.md`).

These axes must not be collapsed into one user action.

The ACP Skills drawer's primary task status is a workflow projection, not a
sixth mutable run axis. `resolveAcpSkillRunWorkflowTaskState()` is the SSOT for
the card's main status. Run lifecycle, backend status, apply state, recovery,
connection, and attention remain separately visible; when one is unavailable,
the projector omits it instead of substituting another axis.

## Prompt Outcome Governance

ACP prompt lifecycle failures are separate from SkillRunner output contract
failures.

- Protocol-visible prompt stops such as `refusal`, `max_tokens`,
  `max_turn_requests`, and non-user-requested `cancelled` fail the run as an
  ACP prompt lifecycle failure and do not enter output repair.
- `end_turn` is a normal ACP stop reason. An empty assistant text at `end_turn`
  is treated as `acp-prompt-no-output` only when the plugin observed no ACP
  `session/update` activity during that prompt turn and result-file fallback
  cannot recover a valid result.
- If the user has already interrupted the current prompt turn, a later
  `end_turn` response is still governed as an interrupted turn. It must not
  enter result-file fallback, output validation, output repair, or workflow
  apply.
- ACP-visible prompt errors, including JSON-RPC request errors and explicit
  prompt-level provider `session/update` diagnostics such as `backend_error` or
  `prompt_error`, are prompt lifecycle failures. They should be surfaced to the
  run transcript without claiming a backend-private root cause.
- Tool updates are not prompt lifecycle failures. A `tool_call` or
  `tool_call_update` with failed or error status, including tool output fields
  such as `rawOutput.error`, remains normal ACP tool activity and must not
  prevent later assistant output from entering validation, apply, or bounded
  repair.
- Prompt-level provider `session/update` diagnostics must not override a
  non-empty assistant output candidate observed in the same prompt turn; the
  assistant output remains governed by output validation.
- If the prompt turn produced ACP activity such as thought chunks, tool calls,
  tool updates, or plan updates, an empty assistant text remains governed by
  normal result-file fallback and bounded output validation/repair.
- Backend-private transcripts are not consulted for these decisions.

### Run Status

```typescript
export type AcpSkillRunStatus =
  | "queued"
  | "running"
  | "waiting_user"
  | "repairing"
  | "failed_retriable"
  | "succeeded"
  | "failed"
  | "canceled";
```

- `queued` — run is waiting to start (default initial value for new records).
- `running` — run is actively executing.
- `waiting_user` — run is paused, waiting for user input.
- `repairing` — run is in output repair/revision loop.
- `failed_retriable` — non-terminal: prompt/session failed, but the ACP
  session remains recoverable and can be reconnected or canceled.
- `succeeded` — terminal: run completed successfully.
- `failed` — terminal: run finished with an unrecoverable error.
- `canceled` — terminal: run was canceled by user or provider.

Normalized by `normalizeStatus` (default: `"running"`). Terminal
check: `isTerminalAcpSkillRunStatus`.

### Conversation State

```typescript
export type AcpSkillRunConversationState =
  | "starting"
  | "active"
  | "ended"
  | "closed"
  | "error";
```

- `starting` — ACP session is being initialized.
- `active` — session is ready and accepting prompts.
- `ended` — session has completed naturally.
- `closed` — session was explicitly closed.
- `error` — session encountered a fatal error.

Normalized by `normalizeConversationState` (default: `"closed"`).

### Recovery State

```typescript
export type AcpSkillRunRecoveryState =
  | "unavailable"
  | "available"
  | "connecting"
  | "connected"
  | "failed"
  | "unsupported";
```

- `unavailable` — session recovery is not available (default).
- `available` — backend supports recovery of this session.
- `connecting` — recovery connection is in progress.
- `connected` — recovery connection established.
- `failed` — recovery attempt failed.
- `unsupported` — backend does not support session recovery.

Normalized by `normalizeRecoveryState` (default: `"unavailable"`).

### Connection Action State

```typescript
export type AcpSkillRunConnectionActionState =
  | "idle"
  | "connecting"
  | "disconnecting";
```

- `idle` — no connection action in progress (default).
- `connecting` — connection establishment is underway.
- `disconnecting` — connection teardown is underway.

Normalized by `normalizeConnectionActionState` (default: `"idle"`).

### Reply State

```typescript
export type AcpSkillRunReplyState =
  | "idle"
  | "submitted"
  | "accepted"
  | "rejected";
```

- `idle` — no prompt call active (default).
- `submitted` — user reply has been submitted to the ACP prompt.
- `accepted` — submitted reply was accepted by the backend.
- `rejected` — submitted reply was rejected (e.g., validation failure).

Normalized by `normalizeReplyState` (default: `"idle"`).

### Output Revision Status (Supplementary)

```typescript
export type AcpSkillRunOutputRevisionStatus = "invalid" | "pending" | "final";
```

Tracks output validation/revision state. Not a primary control axis but
interacts with `repairing` run status and `replyState`.

## State Axes Relationships

The five axes evolve independently but have well-defined constraints:

```
Run Status:    queued → running → waiting_user ─→ succeeded
                  │         │   │   ↑             │  failed
                  │         │   │   └── repairing ─┘  canceled
                  │         │   └────→ failed_retriable
                  │         │             │
                  │         └─────────────┘
                  │              recover/reply/cancel/terminalize
                  └──── running (when dequeued)

Conversation:  starting → active → ended → closed
                              │         │
                              └── error ┘

Recovery:      unavailable → available → connecting → connected
                                │            │            │
                                └────────────┴── failed ──┘
                  unsupported (parallel terminal)

Connection
  Action:     idle → connecting → idle
              idle → disconnecting → idle

Reply:        idle → submitted → accepted → idle
                              │
                              └── rejected → idle
```

### Combined State Constraints

A reply acknowledgement does not replace the main run status transition. When
an accepted reply starts a continuation prompt, a non-terminal `waiting_user` or
`failed_retriable` run moves to `running`, sets `activePrompt = true`, clears
`pendingInteraction`, and resets the previous prompt-interruption state before
the prompt is issued. If a recovered follow-up has no workflow-output
convergence context, normal prompt completion returns the run to `waiting_user`;
prompt failure returns it to `failed_retriable` while the session remains
recoverable.

- `replyState !== "idle"` implies `conversationState === "active"`.
- `connectionActionState === "connecting"` implies `recoveryState` is in
  `connecting | available`.
- `connectionActionState === "disconnecting"` implies `conversationState` will
  transition to `closed` after the action completes.
- `status === "repairing"` implies `outputRevisionStatus` is not `"final"`.
- A terminal run status (`succeeded | failed | canceled`) implies
  `conversationState` should eventually be `closed` or `ended`.
- `status === "failed_retriable"` or `status in running | repairing`,
  `conversationState === "closed"`,
  `conversationRecoveryState === "available"`, a non-empty `sessionId`, and
  `activePrompt !== true` means a detached recoverable run. It is not an active
  prompt turn and must not be projected as a busy interrupt state.

## User Controls

### Cancel Current Turn

Canceling the current turn stops only the active ACP prompt call.

- Invokes `interruptTurn` on the `AcpSkillRunController`.
- Sets `status = "waiting_user"` after the current prompt is interrupted. The
  run is not terminal; the next prompt belongs to the user.
- Does **not** disconnect the ACP connection — `conversationState` and
  `connectionActionState` are unchanged.
- For recovered sessions, `interruptTurn` is valid only while an active prompt
  turn exists. It must not detach a recovered session merely because the run is
  non-terminal.
- If the backend later reports `end_turn` after the interrupt request, the turn
  remains interrupted and is not reclassified as successful output convergence.
- Sets `replyState` back to `idle` if it was `submitted`.
- Records `lastPromptStopReason` for diagnostics.
- Leaves the run available for a later user prompt.
- Any assistant text returned after the turn was canceled is ignored for output
  validation, result-file fallback, and output repair.
- If the run is executing as a sequence step, Host returns a deferred provider
  result with `backendStatus = "waiting_user"` so the parent sequence parks at
  the current step and does not start downstream skills.

The ACP Skills reply composer uses this action only while an active prompt turn
exists. After interruption completes, the composer switches back to normal
reply mode.

### Disconnect

Disconnecting detaches the local ACP connection.

- If a prompt turn is active (`replyState !== "idle"`), Host first stops that
  turn via `interruptTurn`.
- Sets `connectionActionState = "disconnecting"`.
- Does **not** mark the run terminal — `status` is unchanged.
- If the run is waiting for user input (`status = "waiting_user"`), has a
  `pendingInteraction`, or still has pending output convergence, shutdown or
  disconnect preserves the run as a non-terminal deferred ACP result instead of
  reporting provider success.
- A deferred disconnect result must not run workflow `applyResult`, must not set
  `applyResultState = "succeeded"`, and must not close the parent workflow task
  as business-successful.
- Leaves the run recoverable when the backend supports session recovery:
  `recoveryState` retains its current value (likely `available`).
- After the disconnect completes, `conversationState` transitions to `closed`.
- Any assistant text returned after the disconnect request is ignored for output
  validation, result-file fallback, and output repair.

### Hard Timeout Disconnect

`runtime_options.hard_timeout_seconds` is a local ACP connection guard for ACP
SkillRunner-compatible runs. It is not a task terminal state and does not add a
new state axis.

- Effective timeout options are resolved before execution. Submit-time
  `providerOptions.hard_timeout_seconds` is the highest-priority runtime
  override, followed by request payload `runtime_options.hard_timeout_seconds`,
  then `runner.json.runtime.default_options.hard_timeout_seconds`, then the
  built-in default of `1200` seconds. Only positive integers are valid.
- The initial run starts timeout monitoring only after ACP session creation,
  mode/model/config setup, and session preparation have reached the prompt-ready
  boundary. Session setup time is not counted as agent execution time.
- Auto execution uses one continuous prompt execution window. Interactive
  execution uses one window per agent turn; entering `waiting_user` clears the
  timer, and a later user reply starts a fresh window.
- Pending ACP permission requests pause the local hard timeout guard for both
  auto and interactive runs. Approval, denial, cancellation, or auto-approval
  resumes timeout monitoring with a fresh full timeout window for the still
  active agent turn. This does not change `status`, `pendingPermission`, the
  remote session, or the permission UI protocol.
- Recovered sessions recompute effective timeout options and apply the same
  prompt-ready/per-turn timing rules.
- On expiry, the runner records `hard-timeout-disconnect-requested`, attempts
  to cancel the active ACP prompt, drains already-arrived transcript updates for
  a bounded local window, closes any open streaming transcript item, appends a
  localized timeout status item after the drained transcript, and then closes
  the local adapter through the recoverable disconnect path.
- Hard timeout disconnect leaves the run non-terminal. `status` must not become
  `failed` or `canceled`; `conversationState` becomes `closed`,
  `conversationRecoveryState` remains `available` when the session can be
  recovered, and `activePrompt`/`replyState` return to idle values.

### Connect Recoverable Detached Run

Connecting a recoverable detached run is explicit user action; plugin startup
does not automatically attach remote sessions.

- If the run has pending user input or permission, connect only attaches the
  remote session and leaves the run waiting for the user action.
- If the run has workflow output-convergence context and no pending user action,
  connect attaches the session and sends the recovered continuation guard prompt.
- Automatic continuation after connect uses the same recovered output
  validation, result-file fallback, repair, pending, final apply, and sequence
  continuation paths as a recovered user reply.
- The automatic continuation is recorded as recovery activity and must not be
  recorded as a user-authored reply.

### Cancel Task

Canceling the task terminates the ACP Skills job.

- Stops the active prompt turn when one exists through the task-level cancel
  controller, not through current-turn `interruptTurn`.
- Sets `connectionActionState = "disconnecting"`.
- Disconnects the ACP connection (`conversationState → "closed"`).
- Marks the run `status = "canceled"` and clears recovery state
  (`recoveryState → "unavailable"`).
- If the run is a sequence step, the parent sequence stops and downstream steps
  must not start.

## Invariants

1. **Current-turn cancel and disconnect are recoverable pauses, not job
   terminal states.** — Only `status = "canceled"` (or provider terminal
   canceled) is terminal.

2. **Only Cancel Task or a provider terminal canceled result may produce a
   terminal canceled run.** — `interruptTurn` and `disconnect` must never set
   `status = "canceled"`.

3. **Output convergence is allowed only for text returned by a live,
   non-stopped prompt turn.** — Text captured after interrupt or disconnect is
   excluded from validation, result-file fallback, and repair.

4. **Repair prompts must never be generated from text captured after
   current-turn cancel or disconnect.**

5. **Pending interaction is authoritative over stale busy/apply state.** — A
   recoverable run with `pendingInteraction` remains user-actionable even if an
   older record still says `status = "running"` or `applyResultState =
   "succeeded"`. Reconnect/reply should treat that state as a deferred
   continuation, not as completed workflow apply.

6. **Run status lifecycle** — `queued → running` is the normal entry path.
   From `running`, valid transitions are: `waiting_user`, `repairing`,
   `failed_retriable`, `succeeded`, `failed`, `canceled`. From
   `waiting_user`: back to `running`, or `repairing`, or
   `failed_retriable`, or terminal. From `repairing`: back to `running`, or
   `waiting_user`, or `failed_retriable`, or terminal. From
   `failed_retriable`: back to `running`, `waiting_user`, or `repairing`, or
   terminal. Terminal states are absorbing.

7. **Conversation state lifecycle** — `starting → active → ended → closed`
   is the happy path. `active → error` is possible when the backend encounters
   a fatal protocol error. Once `closed` or `error`, the conversation should
   not transition back to `active` without a new session.

8. **Recovery and connection action coupling** — A recovery attempt sets
   `connectionActionState = "connecting"`. On success, `recoveryState` moves
   to `connected` and `connectionActionState` returns to `"idle"`. On failure,
   `recoveryState` becomes `failed`. `connectionActionState` must not remain
   `"connecting"` indefinitely — a timeout or error path clears it.

9. **Reply state constraint** — `submitted → accepted | rejected` are the only
   valid forward transitions from `submitted`. `accepted` or `rejected` must
   eventually return to `idle`. `interruptTurn` is only valid when
   `activePrompt = true` or `replyState` is `submitted | accepted`.

10. **Detached recoverable UI projection** — A detached recoverable run remains
    visible in active task lists with warning attention, exposes Connect, and
    does not expose current-turn interrupt until a prompt is actually active.

11. **Connected idle runs are not busy prompt turns.** — A non-terminal run with
    `conversationRecoveryState = "connected"`, `activePrompt = false`, and
    `replyState = "idle"` must not expose current-turn cancel. It may remain
    connected for later user action or diagnostics.

## Implementation Mapping

| Concept | Code Location |
|---------|---------------|
| Run Status 定义 | `src/modules/acpSkillRunStore.ts` |
| Conversation State 定义 | `src/modules/acpSkillRunStore.ts` |
| Recovery State 定义 | `src/modules/acpSkillRunStore.ts` |
| Reply State 定义 | `src/modules/acpSkillRunStore.ts` |
| Connection Action State 定义 | `src/modules/acpSkillRunStore.ts` |
| Output Revision Status 定义 | `src/modules/acpSkillRunStore.ts` |
| `normalizeStatus` | `src/modules/acpSkillRunStore.ts` |
| `normalizeConversationState` | `src/modules/acpSkillRunStore.ts` |
| `normalizeRecoveryState` | `src/modules/acpSkillRunStore.ts` |
| `normalizeReplyState` | `src/modules/acpSkillRunStore.ts` |
| `normalizeConnectionActionState` | `src/modules/acpSkillRunStore.ts` |
| `isTerminalAcpSkillRunStatus` | `src/modules/acpSkillRunStore.ts` |
| `AcpSkillRunRecord` 完整记录 | `src/modules/acpSkillRunStore.ts` |
| `AcpSkillRunController` (interruptTurn, cancel) | `src/modules/acpSkillRunStore.ts` |
| ACP workflow disconnect/deferred outcome | `src/modules/acpSkillRunnerOrchestrator.ts` |
| Workflow apply skip for recoverable ACP deferred results | `src/modules/workflowExecution/applySeam.ts` |
| ACP Skills pending interaction projection | `addon/content/shared/assistant/assistant-panel-model.js` |
| `AcpConnectionAdapter` 连接生命周期 | `src/modules/acpConnectionAdapter.ts` |
| `AcpConnectionStatus` (Adapter 层) | `src/modules/acpTypes.ts` |
