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
- If the prompt turn produced ACP activity such as thought chunks, tool calls,
  tool updates, or plan updates, an empty assistant text remains governed by
  normal result-file fallback and bounded output validation/repair.
- Backend-private transcripts are not consulted for these decisions.

### Run Status

```typescript
// src/modules/acpSkillRunStore.ts:38-45
export type AcpSkillRunStatus =
  | "queued"
  | "running"
  | "waiting_user"
  | "repairing"
  | "succeeded"
  | "failed"
  | "canceled";
```

- `queued` — run is waiting to start (default initial value for new records).
- `running` — run is actively executing.
- `waiting_user` — run is paused, waiting for user input.
- `repairing` — run is in output repair/revision loop.
- `succeeded` — terminal: run completed successfully.
- `failed` — terminal: run finished with an error.
- `canceled` — terminal: run was canceled by user or provider.

Normalized by `normalizeStatus` (line 441, default: `"running"`). Terminal
check: `isTerminalAcpSkillRunStatus` (line 1153).

### Conversation State

```typescript
// src/modules/acpSkillRunStore.ts:47-52
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

Normalized by `normalizeConversationState` (line 457, default: `"closed"`).

### Recovery State

```typescript
// src/modules/acpSkillRunStore.ts:54-60
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

Normalized by `normalizeRecoveryState` (line 473, default: `"unavailable"`).

### Connection Action State

```typescript
// src/modules/acpSkillRunStore.ts:68-71
export type AcpSkillRunConnectionActionState =
  | "idle"
  | "connecting"
  | "disconnecting";
```

- `idle` — no connection action in progress (default).
- `connecting` — connection establishment is underway.
- `disconnecting` — connection teardown is underway.

Normalized by `normalizeConnectionActionState` (line 499, default: `"idle"`).

### Reply State

```typescript
// src/modules/acpSkillRunStore.ts:62-66
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

Normalized by `normalizeReplyState` (line 487, default: `"idle"`).

### Output Revision Status (Supplementary)

```typescript
// src/modules/acpSkillRunStore.ts:73
export type AcpSkillRunOutputRevisionStatus = "invalid" | "pending" | "final";
```

Tracks output validation/revision state. Not a primary control axis but
interacts with `repairing` run status and `replyState`.

## State Axes Relationships

The five axes evolve independently but have well-defined constraints:

```
Run Status:    queued → running → wait_user ──→ succeeded
                  │         │   │   ↑             │  failed
                  │         │   │   └── repairing ─┘  canceled
                  │         │   └──────→ (terminal)
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

- `replyState !== "idle"` implies `conversationState === "active"`.
- `connectionActionState === "connecting"` implies `recoveryState` is in
  `connecting | available`.
- `connectionActionState === "disconnecting"` implies `conversationState` will
  transition to `closed` after the action completes.
- `status === "repairing"` implies `outputRevisionStatus` is not `"final"`.
- A terminal run status (`succeeded | failed | canceled`) implies
  `conversationState` should eventually be `closed` or `ended`.

## User Controls

### Cancel Current Turn

Canceling the current turn stops only the active ACP prompt call.

- Invokes `interruptTurn` on the `AcpSkillRunController` (line 338).
- Does **not** modify `status` — run stays in `running | waiting_user`.
- Does **not** disconnect the ACP connection — `conversationState` and
  `connectionActionState` are unchanged.
- Sets `replyState` back to `idle` if it was `submitted`.
- Records `lastPromptStopReason` for diagnostics.
- Leaves the run available for a later user prompt.
- Any assistant text returned after the turn was canceled is ignored for output
  validation, result-file fallback, and output repair.

The ACP Skills reply composer uses this action while `replyState !== "idle"`.

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

### Cancel Task

Canceling the task terminates the ACP Skills job.

- Stops the active prompt turn when one exists (`interruptTurn`).
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

6. **Run status lifecycle** — `queued → running` is the only entry path.
   From `running`, valid transitions are: `waiting_user`, `repairing`,
   `succeeded`, `failed`, `canceled`. From `waiting_user`: back to `running`,
   or `repairing`, or terminal. From `repairing`: back to `running`, or
   `waiting_user`, or terminal. Terminal states are absorbing.

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
   `replyState !== "idle"`.

## Implementation Mapping

| Concept | Code Location |
|---------|---------------|
| Run Status 定义 | `src/modules/acpSkillRunStore.ts:38-45` |
| Conversation State 定义 | `src/modules/acpSkillRunStore.ts:47-52` |
| Recovery State 定义 | `src/modules/acpSkillRunStore.ts:54-60` |
| Reply State 定义 | `src/modules/acpSkillRunStore.ts:62-66` |
| Connection Action State 定义 | `src/modules/acpSkillRunStore.ts:68-71` |
| Output Revision Status 定义 | `src/modules/acpSkillRunStore.ts:73` |
| `normalizeStatus` | `src/modules/acpSkillRunStore.ts:441-455` |
| `normalizeConversationState` | `src/modules/acpSkillRunStore.ts:457-471` |
| `normalizeRecoveryState` | `src/modules/acpSkillRunStore.ts:473-485` |
| `normalizeReplyState` | `src/modules/acpSkillRunStore.ts:487-497` |
| `normalizeConnectionActionState` | `src/modules/acpSkillRunStore.ts:499-507` |
| `isTerminalAcpSkillRunStatus` | `src/modules/acpSkillRunStore.ts:1153-1157` |
| `AcpSkillRunRecord` 完整记录 | `src/modules/acpSkillRunStore.ts:179-256` |
| `AcpSkillRunController` (interruptTurn, cancel) | `src/modules/acpSkillRunStore.ts:330-343` |
| ACP workflow disconnect/deferred outcome | `src/modules/acpSkillRunnerOrchestrator.ts` |
| Workflow apply skip for recoverable ACP deferred results | `src/modules/workflowExecution/applySeam.ts` |
| ACP Skills pending interaction projection | `addon/content/dashboard/assistant-panel-model.js` |
| `AcpConnectionAdapter` 连接生命周期 | `src/modules/acpConnectionAdapter.ts:102-125` |
| `AcpConnectionStatus` (Adapter 层) | `src/modules/acpTypes.ts:4-13` |
