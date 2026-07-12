## Context

ACP Chat and ACP Skills share `AcpConnectionAdapter.cancel`, which writes the one-way ACP `session/cancel` notification. The current callers immediately project a terminal cancelled/interrupted UI state even though the original `session/prompt` promise remains active. Both paths can continue receiving updates; Chat can additionally admit another prompt, while Skills can later reinterpret a normal backend completion as interrupted.

The ACP contract makes the original prompt response the confirmation boundary. Assistant Workspace rendering also requires transcript changes to remain isolated from non-transcript managed regions.

## Goals / Non-Goals

**Goals:**

- Represent cancellation intent separately from confirmed, forced, and unconfirmed outcomes.
- Keep one lifecycle owner for each active prompt and prevent stale completion paths from overwriting newer state.
- Guarantee a bounded local stop by closing the conversation/run-owned adapter after 10 seconds.
- Preserve protocol-permitted trailing updates without rebuilding unrelated panel regions.
- Preserve the backend's real result when it does not confirm cancellation.

**Non-Goals:**

- Changing the ACP wire protocol or adding a private acknowledgement message.
- Implementing cancellation inside external ACP agents.
- Migrating historical transcript persistence.
- Sharing adapters between conversations or skill runs.

## Decisions

### Separate connection state from prompt interruption state

Add a shared `AcpPromptInterruptState` value (`idle`, `requested`, `confirmed`, `forced`, `unconfirmed`) to Chat snapshots and Skills run projections. Connection status continues to describe transport/session state; it does not gain a synthetic `cancelling` connection status.

Alternative considered: reuse `prompting`/`waiting_user` or add `cancelling` to connection status. This was rejected because it conflates a turn-level intent with transport state and reproduces the current ambiguity.

### Treat prompt settlement as the only protocol confirmation

The adapter `cancel` contract only promises that the notification was written, rejects when no live connection exists, and delegates to the explicitly named low-level `notifySessionCancel` method. A backend `stopReason: "cancelled"` produces `confirmed`; any other backend result is preserved and produces `unconfirmed`. Local cancel flags are not returned as prompt results.

### Use a prompt-generation guard and one settlement owner

Each Chat runtime and Skills controller owns an active prompt token plus a settlement signal. Notification send, prompt resolve/reject, connection close, and timeout converge through one guarded settlement path. Timers and late outcomes for an old token cannot mutate a newer prompt.

### Accept updates until the original prompt settles

While interruption is `requested`, session updates continue through the existing transcript projection because ACP permits trailing updates before the prompt response. New prompts and replies remain disabled. After settlement there is no active turn to receive further updates.

### Escalate after a fixed grace period

After 10 seconds without settlement, close the adapter through existing cleanup APIs. Chat retains `remoteSessionId` and reconnects through resume, load, or new session. Skills remains recoverable only when resume/load is supported; otherwise the run becomes terminal. Notification write failure uses the same force-close path immediately.

### Keep lifecycle state in the orchestrator/manager

`AcpSessionManager` owns Chat transitions. The Skills orchestrator owns Skills transitions; the Store stops duplicating optimistic state writes. Durable Skills events are `interrupt-requested`, `interrupt-confirmed`, and `interrupt-forced`.

## Risks / Trade-offs

- **Forced close can lose remote context** → Chat uses its existing new-session fallback; Skills terminates runs that cannot resume or load.
- **A backend can return a normal result after cancellation intent** → Preserve the real result and expose `unconfirmed` instead of disguising it.
- **Transport close can fail** → Do not claim `forced`; surface `unconfirmed` with the existing error state.
- **Trailing updates increase activity while cancelling** → Keep them scoped to the transcript region and lock managed-region DOM identity in tests.
- **Live and recovered Skills paths can drift** → Share the interrupt watchdog/settlement helper and cover both paths with the same behavioral cases.
