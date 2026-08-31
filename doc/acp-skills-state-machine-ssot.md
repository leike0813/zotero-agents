# ACP Skills State Machine SSOT

This document is the single source of truth for ACP Skills run controls, their
persisted state semantics, and the boundaries with Host submission admission
and Assistant Workspace projection.

## State Axes

ACP Skills has six related but separate persisted state axes:

- Run status: overall job progress (`AcpSkillRunStatus`).
- Conversation state: local ACP conversation attachment lifecycle, distinct
  from the lifetime of the remote ACP session
  (`AcpSkillRunConversationState`).
- Recovery state: whether the persisted run is a recovery candidate and the
  progress or negotiated result of a recovery attempt
  (`AcpSkillRunRecoveryState`).
- Connection action state: connection-level action tracking
  (`AcpSkillRunConnectionActionState`).
- Reply state: local reply admission and live-controller handoff state
  (`AcpSkillRunReplyState`).
- Prompt interruption state: settlement of a current-turn interruption request
  (`AcpPromptInterruptState`).

Additionally, when the run is a sequence step, the parent
`skillrunner.sequence.v1` orchestration state applies as a separate axis
(defined by `doc/skillrunner-sequence-recovery-state-machine.md`).

Host-submitted runs also participate in a submission slot lifecycle. The slot
state is owned by the Host submission queue rather than the ACP run record and
is described under [Related Orchestration State](#related-orchestration-state).

These axes and the related orchestration state must not be collapsed into one
user action.

The ACP Skills drawer's primary task status is a projection, not another
mutable run axis. `resolveAcpSkillRunWorkflowTaskState()` produces the
navigation task state from the run record. The shared Assistant panel projector
then derives presentation fields: it uses the main status as a display fallback
for a missing Backend value, derives an idle or not-required Apply fallback,
promotes backend/apply failure or cancellation to the displayed main status,
and replaces the displayed main status with `resumption-pending` while the Host
slot waits for priority readmission. These display fallbacks do not mutate the
nullable source facts in the owner-navigation publication.

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
- `failed` — terminal: workflow execution or apply finished with an error. The
  task cannot resume, although its ACP conversation may remain recoverable.
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

- `starting` — a local ACP attachment is being initialized.
- `active` — the local attachment is ready and can issue prompts against the
  remote session.
- `ended` — the run-local conversation lifecycle intentionally ended and is no
  longer eligible for continuation, including task-level cancellation. This
  does not claim that the backend deleted its remote session record.
- `closed` — the local attachment was detached or closed; a recoverable remote
  session may still exist.
- `error` — the local attachment encountered a fatal error.

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

- `unavailable` — the run is not currently eligible to attempt recovery
  (default).
- `available` — the persisted run has enough identity to offer or attempt
  recovery. Backend resume/load support may still be unknown until connection
  negotiation.
- `connecting` — recovery connection is in progress.
- `connected` — recovery established a live local attachment to the remote
  session.
- `failed` — recovery attempt failed.
- `unsupported` — capability negotiation confirmed that the backend supports
  neither session resume nor session load.

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

- `idle` — no reply admission or live-controller handoff is in progress
  (default). The agent may still have an active prompt, tracked separately by
  `activePrompt`.
- `submitted` — Host accepted the user reply locally. It may still be waiting
  for submission-slot readmission or recovery of a detached session, so the
  conversation may remain `closed`.
- `accepted` — a live controller accepted the reply for prompt processing and
  the local conversation attachment is `active`. This does not by itself mean
  that the remote agent completed the prompt.
- `rejected` — admission, recovery, controller handoff, or reply validation
  rejected the submission before a usable continuation was established.

Normalized by `normalizeReplyState` (default: `"idle"`).

### Prompt Interruption State

```typescript
export type AcpPromptInterruptState =
  | "idle"
  | "requested"
  | "confirmed"
  | "forced"
  | "unconfirmed";
```

- `idle` — no current-turn interruption outcome applies.
- `requested` — Host sent `session/cancel`, but the original prompt is still
  active and its settlement still owns the next transition.
- `confirmed` — the original prompt returned a cancellation outcome or settled
  after the interruption request; its assistant text is excluded from output
  convergence.
- `forced` — the prompt did not settle within the grace window, so Host closed
  the adapter and chose the next run state from negotiated recovery capability.
- `unconfirmed` — forced adapter cleanup failed; the run becomes retriable and
  retains diagnostic state instead of claiming a confirmed interruption.

Normalized by `normalizeAcpPromptInterruptState` (default: `"idle"`). A new
prompt resets the previous interruption state before it is issued.

### Output Revision Status (Supplementary)

```typescript
export type AcpSkillRunOutputRevisionStatus = "invalid" | "pending" | "final";
```

Tracks output validation/revision state. Not a primary control axis but
interacts with `repairing` run status and `replyState`.

## Related Orchestration State

### Host Submission Slot

A Host-submitted workflow unit owns a slot state independently of the ACP run
status:

```typescript
export type WorkflowSubmissionSlotState =
  | "held"
  | "yielded"
  | "resumption-pending"
  | "settled";
```

- `held` — the unit owns admission while provider work or Host-owned apply is
  active.
- `yielded` — a non-terminal `waiting-user`, `waiting-auth`, or
  `recoverable-failure` yield reason released the slot without settling the
  unit.
- `resumption-pending` — a reply, authorization, retry, remote recovery, or
  Host apply is queued for priority readmission within its submission.
- `settled` — the unit reached its terminal submission outcome and can no
  longer reacquire a slot.

The queue may expose `pending` or `admitted` before or around run creation.
Those navigation states are owned by the submission queue, not represented by
inventing additional `AcpSkillRunStatus` values. A reply can therefore be
`submitted` while the conversation is detached and its slot is
`resumption-pending`. Cancellation remains available without a held slot and
must cancel any unsent resumption callback.

Post-terminal conversation is outside this lifecycle. Connect and Reply on an
eligible terminal run neither acquire nor retain a submission slot. A terminal
sequence step may therefore converse while later steps execute; that
conversation cannot change slot counts, sequence state, or downstream steps.

### Setup and Live Controller Ownership

After a run record is created, setup registers a request-scoped cancellation
handle before its first blocking await. The setup handle does not make the
conversation connected or recoverable. Successful setup atomically replaces
that handle with the live controller; identity-checked cleanup must not remove
a newer controller. Task cancellation during setup stops later setup stages,
closes an adapter that arrives late, and settles the run without starting a
session or prompt.

Setup consists of managed npx lease acquisition, transport launch, ACP
initialize, session new/load/resume, and initial mode/model/configuration.
Each stage has an independent 60-second limit. `connected` is published only
after the session and its initial runtime selection are usable. Timeout is a
terminal startup failure with the stage and timeout recorded in diagnostics;
cancel or timeout also revokes ownership, so a late lease, transport, RPC
response, or configuration result must be discarded and cannot install a live
controller or start a prompt.

Every controller installed by initial workflow execution has `workflow`
purpose for its entire lifetime, including the interval between terminal apply
settlement and asynchronous detach. Only explicit Connect may install a
`post-terminal-conversation` controller. Purpose is process-local and is not
persisted in the run record.

### Workspace Owner and Transcript Publication

ACP Skills uses `requestId` as its workspace and transcript owner identity.
Selection is an in-memory UI state rather than a persisted run axis. Owner
changes publish the new owner's loading-first or empty snapshot before indexed
page reads and full-mirror hydration. Results produced for an older owner must
not update the selected owner's transcript or managed regions. These
publication states govern UI ordering and command routing; they do not mutate
the six persisted run axes.

## State Axes Relationships

The six persisted axes evolve independently but have well-defined constraints:

```
Run Status:    queued → running → waiting_user ─→ succeeded
                  │         │   │   ↑             │  failed
                  │         │   │   └── repairing ─┘  canceled
                  │         │   └────→ failed_retriable
                  │         │             │
                  │         └─────────────┘
                  │              recover/reply/cancel/terminalize
                  └──── running (when dequeued)

Conversation:  starting → active ─────────────→ ended
                  ↑        │  └───────────────→ error
                  │        └── local detach ──→ closed
                  └──── successful resume/load ┘

Recovery:      unavailable ←── identity mismatch
                    │
                    └→ available → connecting → connected
                                      │             │
                                      ├→ failed     └→ available (detach)
                                      └→ unsupported

Connection
  Action:     idle → connecting → idle
              idle → disconnecting → idle

Reply:        idle → submitted → accepted → idle
                         │          │
                         └──────────┴→ rejected → idle

Interruption: idle → requested ─→ confirmed ───┐
                         ├───→ forced ─────────┼→ idle (next non-terminal prompt)
                         └───→ unconfirmed ────┘
```

### Combined State Constraints

A reply acknowledgement does not replace the main run status transition.
`submitted` is a local admission state and may wait with
`conversationState === "closed"` while the Host reacquires a slot or restores
the session. After a live controller accepts the reply, the local attachment is
`active`; before the continuation prompt is issued, a non-terminal
`waiting_user` or `failed_retriable` run moves to `running`, sets
`activePrompt = true`, clears `pendingInteraction`, and resets the previous
prompt-interruption state. If a recovered follow-up has no workflow-output
convergence context, normal prompt completion returns the run to `waiting_user`;
prompt failure returns it to `failed_retriable` while the session remains a
recovery candidate.

- `replyState === "submitted"` does not imply an active local attachment or a
  remote prompt call. It may imply a `resumption-pending` Host slot.
- `replyState === "accepted"` implies `conversationState === "active"` and a
  live controller accepted the continuation.
- `connectionActionState === "connecting"` implies
  `conversationRecoveryState` is in
  `connecting | available`.
- `connectionActionState === "disconnecting"` implies `conversationState` will
  transition to `closed` after the action completes.
- `status === "repairing"` implies `outputRevisionStatus` is not `"final"`.
- A terminal run status (`succeeded | failed | canceled`) implies
  `conversationState` should eventually be `closed` or `ended`.
- Terminal absorption applies to the task axis. An eligible `succeeded` or
  `failed` run may move its conversation between `closed` and `active` without
  changing task, output, apply, or sequence evidence.
- `promptInterruptState === "requested"` preserves `activePrompt = true` and
  the current `running | repairing` state until the original prompt settles or
  the interruption watchdog forces adapter closure.
- `promptInterruptState === "forced"` yields `waiting_user + available` when
  recovery was negotiated, or terminal `canceled + unsupported` otherwise.
- `status === "failed_retriable"` or `status in running | repairing`,
  `conversationState === "closed"`,
  `conversationRecoveryState === "available"`, a non-empty `sessionId`, and
  `activePrompt !== true` means a detached recovery candidate. When
  `replyState === "idle"` and no slot resumption is pending, it is not an active
  prompt turn and must not be projected as a busy interrupt state.

## User Controls

### Cancel Current Turn

Canceling the current turn requests that the current ACP prompt stop. The
original prompt remains authoritative until it settles or the interruption
watchdog forces the local adapter closed.

- Invokes `interruptTurn` on the `AcpSkillRunController`.
- The request sets `promptInterruptState = "requested"` while preserving
  `activePrompt = true` and the current `running | repairing` run state. Reply
  remains disabled while settlement is pending.
- If the original prompt settles or confirms cancellation, Host sets
  `status = "waiting_user"`, `promptInterruptState = "confirmed"`, and keeps the
  adapter available for the next user prompt.
- If the prompt remains unsettled for the interruption grace window, Host
  closes the adapter. A recoverable session becomes
  `waiting_user + forced + available`; a session with neither resume nor load
  support becomes terminal `canceled + forced + unsupported`.
- If forced adapter cleanup itself fails, the run becomes
  `failed_retriable + unconfirmed` and records the cleanup error.
- For recovered sessions, `interruptTurn` is valid only while an active prompt
  turn exists. It must not detach a recovered session merely because the run is
  non-terminal.
- If the backend later reports `end_turn` after the interrupt request, the turn
  remains interrupted and is not reclassified as successful output convergence.
- Confirmed or forced settlement returns `replyState` to `idle`.
- Records `lastPromptStopReason` for diagnostics.
- Leaves the run available for a later user prompt only when the adapter remains
  live or the remote session is recoverable.
- Any assistant text returned after the turn was canceled is ignored for output
  validation, result-file fallback, and output repair.
- If the run is executing as a sequence step, Host returns a deferred provider
  result with `backendStatus = "waiting_user"` so the parent sequence parks at
  the current step and does not start downstream skills.

The ACP Skills reply composer uses this action only while an active prompt turn
exists. It shows cancellation progress while interruption is `requested` and
switches back to normal reply mode after a non-terminal confirmed or forced
outcome.

### Disconnect

Disconnecting detaches the local ACP connection.

- If a prompt turn is active (`activePrompt = true`), Host first stops that turn
  through the controller before detaching it. A merely `submitted` detached
  reply is an admission state, not proof of a remote prompt call.
- Sets `connectionActionState = "disconnecting"`.
- Does **not** mark the run terminal — `status` is unchanged.
- If the run is waiting for user input (`status = "waiting_user"`), has a
  `pendingInteraction`, or still has pending output convergence, shutdown or
  disconnect preserves the run as a non-terminal deferred ACP result instead of
  reporting provider success.
- A deferred disconnect result must not run workflow `applyResult`, must not set
  `applyResultState = "succeeded"`, and must not close the parent workflow task
  as business-successful.
- Sets `conversationRecoveryState = "available"` after local detach. Here
  `available` means the run has enough persisted identity to attempt recovery;
  resume/load support is confirmed later during Connect and may yield
  `unsupported`.
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
- The independent 60-second startup-stage limits remain active before that
  boundary. They do not consume or shorten the configured prompt hard timeout.
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

- For a Host-submitted unit, Connect first requests priority slot readmission.
  A canceled admission leaves no recovery prompt in flight.
- The persisted Host Bridge plugin-skill bundle identity must still match the
  current bundle. An identity mismatch rejects recovery and requires a new run
  rather than attaching an incompatible runtime.
- Recovery rebuilds the runtime and Host Bridge environment before creating the
  adapter, then negotiates resume first and load second against the original
  `sessionId`. Negotiated lack of both capabilities yields `unsupported`;
  other recovery failures yield `failed`. All paths clear the connection action
  from `connecting`.
- Successful resume/load creates a new local attachment to the same remote
  session, so `conversationState` may move from `closed` to `active` without
  allocating a replacement `sessionId`.
- If the run has pending user input or permission, connect only attaches the
  remote session and leaves the run waiting for the user action.
- If the run has workflow output-convergence context and no pending user action,
  connect attaches the session and sends the recovered continuation guard prompt.
- Automatic continuation after connect uses the same recovered output
  validation, result-file fallback, repair, pending, final apply, and sequence
  continuation paths as a recovered user reply.
- The automatic continuation is recorded as recovery activity and must not be
  recorded as a user-authored reply.

### Post-terminal Conversation

`succeeded` and `failed` are absorbing workflow task states. They do not end a
recoverable ACP conversation by themselves. The single eligibility classifier,
`isEligibleForPostTerminalAcpSkillRunConversation()`, admits a run only when:

- status is exactly `succeeded` or `failed`;
- the run is not archived or removed and has a non-empty `sessionId`;
- the conversation is not `ended`, and recovery is neither `unavailable` nor
  `unsupported`;
- no pending interaction, pending permission, pending apply, or pending output
  convergence evidence remains; and
- a succeeded run has `applyResultState = "succeeded"`, except that a persisted
  record with no apply-state field is accepted as a legacy completed record.

The classifier is derived from existing fields and is never persisted. A
failed recovery attempt remains a candidate for another explicit Connect unless
capability negotiation proved resume/load unsupported.

Post-terminal Connect resumes or loads only the original session and sends no
prompt. Reply cannot perform implicit recovery: the user must Connect first,
and the active controller must have `post-terminal-conversation` purpose. This
rejects replies during the apply-to-detach interval while the old workflow
controller still exists.

After connection, the user text is sent unchanged. The shared ACP transport,
transcript, tool call, permission, usage, timeout, interrupt, force-stop, and
disconnect machinery remains active. Host Bridge permission rules and existing
auto-approval policy still apply; post-terminal conversation is not read-only.
File interaction and model, mode, or reasoning edits remain unavailable for
terminal runs.

Settlement is conversation-only. Assistant prose and completion-shaped output,
including valid `__SKILL_DONE__` JSON, are transcript content. They never enter
workflow continuation guards, output validation or repair, result writes,
output revisions, apply, or sequence continuation. The following workflow facts
remain frozen across normal completion and every error path:

- `status` and `backendStatus`;
- `applyResultState` and `appliedAt`;
- result JSON and output revisions;
- workflow task and sequence state; and
- the terminal business `error`.

Prompt errors are recorded as `conversationError` or `replyError`. Interrupt,
permission denial, force-stop, hard timeout, and Disconnect settle prompt and
connection fields without changing the terminal task. Unsupported recovery only
closes future conversation recovery.

An apply-failed run may retain `conversationRecoveryState = "available"` when
it has a session and the conversation was not ended. `available` is a candidate
state; the subsequent Connect performs actual resume/load negotiation.

Terminal runs stay in completed/history navigation while connected and while a
prompt is active. Archive remains visible, but `canArchive = false` during
connecting, connected, disconnecting, submitted/accepted reply, or active prompt
state. The store enforces the same rule. Disconnect must complete before the run
can be archived.

Startup does not reconnect terminal sessions. It clears stale local connecting,
connected, prompting, reply, permission, and interruption state to
`closed + available + idle` when the terminal run remains eligible, preserving
all task, apply, output, transcript, usage, sequence, and business-error
evidence.

### Cancel Task

Canceling the task terminates the ACP Skills job.

- Cancels a pending submission-slot resumption and any unresolved permission
  requests before settling the run.
- During setup, invokes the request-scoped setup cancellation handle. Setup
  stops at its next cancellation check, and an adapter that resolves late is
  closed without creating a session or prompt.
- With a live controller, stops the active prompt through the task-level cancel
  controller, not through current-turn `interruptTurn`, then closes the adapter.
- Publishes the terminal canceled record, cancels sequence resumption, updates
  the active sequence step and parent, and notifies Host terminal observers
  before waiting for backend cleanup. Controller cancel and adapter detach use
  the two-second local cleanup watchdog; timeout is diagnostic and cannot retain
  a Host slot or duplicate-submission identity.
- Final state is `status = "canceled"`, `activePrompt = false`,
  `conversationState = "ended"`, `conversationRecoveryState = "unavailable"`,
  and `connectionActionState = "idle"`.
- The no-live-controller and store-level terminal fallback paths set
  `removedAt`, preserving the canonical run record and artifacts while hiding
  that record from default navigation and selected-owner snapshots. A controller
  that has already published a terminal result is not rewritten solely to add
  the marker.
- If the run is a sequence step, the parent sequence stops and downstream steps
  must not start.

## Invariants

1. **Current-turn interruption is settlement-driven.** — Sending
   `session/cancel` preserves the active prompt and current run status until the
   prompt settles. Confirmed interruption is non-terminal. A forced
   interruption is non-terminal only when recovery is supported; lack of both
   resume and load support terminalizes the run as `canceled`.

2. **Task cancellation and disconnect have different terminality.** — Cancel
   Task is terminal across queued, setup, live, detached, and
   resumption-pending phases. Ordinary Disconnect only detaches the local
   attachment and must not terminalize the run. Disconnect cleanup is bounded
   by the same two-second watchdog and preserves recoverable remote identity.

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
   terminal. Terminal states are absorbing. Terminal absorption is enforced for
   every update; the current runtime guard validates the non-terminal matrix
   only when a writer supplies `statusReason`. Lifecycle writers remain required
   to supply the matching reason and obey this matrix; omission does not define
   an additional legal transition.

7. **Conversation state describes the local attachment.** — `starting → active`
   is the attach path. `active → closed` detaches locally while preserving a
   possible remote session; `active → ended` ends the run-local conversation
   lifecycle; `active → error` records a fatal local attachment error. Successful
   resume/load may move `closed` back to `active` while preserving the original
   remote `sessionId`.

8. **Recovery and connection action coupling** — A recovery attempt sets
   `connectionActionState = "connecting"`. On success,
   `conversationRecoveryState` moves to `connected` and
   `connectionActionState` returns to `"idle"`. Negotiated lack of resume/load
   support produces `unsupported`; an attempt failure produces `failed`; a
   bundle-identity mismatch rejects the attachment before session recovery.
   `connectionActionState` must not remain `"connecting"` indefinitely.

9. **Reply state spans Host admission and controller handoff.** —
   `submitted → accepted | rejected` are the valid forward transitions from
   local admission. `accepted → idle | rejected` completes controller handoff.
   `submitted` may coexist with a closed attachment while slot admission or
   recovery is pending. Current-turn interruption remains gated by an actual
   `activePrompt`, not by detached reply admission alone.

10. **Detached recovery-candidate UI projection** — A detached non-terminal run
    remains available in default task navigation, exposes a disconnected hint
    and Connect when its recovery prerequisites are present, and does not expose
    current-turn interruption until a prompt is actually active.

11. **Connected idle runs are not busy prompt turns.** — A non-terminal run with
    `conversationRecoveryState = "connected"`, `activePrompt = false`, and
    `replyState = "idle"` must not expose current-turn cancel. It may remain
    connected for later user action or diagnostics.

12. **Slot ownership is independent from run terminality.** — `waiting-user`,
    `waiting-auth`, and `recoverable-failure` outcomes yield a held slot without
    settling the run. Reply, authorization, retry, recovery, autonomous
    continuation, and apply must regain the unit's slot before backend or
    Host-owned work resumes. Terminal settlement releases at most one held slot.

13. **Setup-to-live replacement is identity-safe.** — Setup cancellation does
    not publish connected/recoverable state. Only the setup handle that owns a
    request may install or remove its controller, and stale setup cleanup must
    not detach a newer live controller.

14. **Workspace publication is owner-scoped.** — ACP Skills commands and
    transcript pages use `requestId` as owner identity. Owner switch publishes
    the new owner before asynchronous page or mirror work; stale work for an old
    owner must be discarded without rebuilding unrelated managed regions.

15. **Terminal task projection is authoritative.** — Task and Host liveness
    project `succeeded | failed | canceled` before permission, reply, pending
    interaction, or conversation-error state. A connected terminal conversation
    remains terminal, never appears in active task lists or
    `resumption-pending`, and has `canCancelWorkflow = false`.

16. **Post-terminal dispatch cannot cross the workflow apply seam.** — Only a
    `workflow` controller may build continuation guards, validate or repair
    output, write result state, continue a sequence, or call apply. A
    `post-terminal-conversation` controller may update only conversation-owned
    prompt, permission, transcript, usage, recovery, and reply-error state.

## Implementation Mapping

| Concept | Code Location |
|---------|---------------|
| Run Status 定义 | `src/modules/acpSkillRunStore.ts` |
| Conversation State 定义 | `src/modules/acpSkillRunStore.ts` |
| Recovery State 定义 | `src/modules/acpSkillRunStore.ts` |
| Reply State 定义 | `src/modules/acpSkillRunStore.ts` |
| Connection Action State 定义 | `src/modules/acpSkillRunStore.ts` |
| Prompt Interruption State 定义与归一化 | `src/modules/acpTypes.ts` |
| Output Revision Status 定义 | `src/modules/acpSkillRunStore.ts` |
| Run record parsing and five run-axis normalizers | `src/modules/acpSkillRunPersistence.ts` |
| `isTerminalAcpSkillRunStatus` | `src/modules/acpSkillRunStore.ts` |
| Post-terminal eligibility and controller purpose | `src/modules/acpSkillRunStore.ts` |
| `AcpSkillRunRecord` 完整记录 | `src/modules/acpSkillRunStore.ts` |
| Setup/live controller registry, reply/connect/disconnect/cancel controls | `src/modules/acpSkillRunStore.ts` |
| Initial ACP lifecycle, interruption, deferred outcome | `src/modules/acpSkillRunnerOrchestrator.ts` |
| Session recovery and recovered controller lifecycle | `src/modules/acpSkillRunRecovery.ts` |
| Host submission slot types | `src/jobQueue/workflowSubmissionQueueContracts.ts` |
| Host submission queue and priority resumption | `src/jobQueue/workflowSubmissionQueue.ts` |
| Workflow apply skip for recoverable ACP deferred results | `src/modules/workflowExecution/applySeam.ts` |
| ACP Skills owner/navigation/interaction projection | `src/modules/acpSkillsWorkspaceSurface.ts` |
| ACP Skills navigation task state | `src/modules/acpSkillRunTaskProjection.ts` |
| Shared Assistant task presentation projection | `src/sidebar/assistantPanelModel.js` |
| Owner-first publication runtime | `src/modules/assistantWorkspacePublicationRuntime.ts` |
| ACP Skills transcript page/mirror lifecycle | `src/modules/acpSkillRunTranscriptMirror.ts` |
| `AcpConnectionAdapter` 连接生命周期 | `src/modules/acpConnectionAdapter.ts` |
| `AcpConnectionStatus` (Adapter 层) | `src/modules/acpTypes.ts` |
