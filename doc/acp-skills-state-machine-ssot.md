# ACP Skills State Machine SSOT

This document is the single source of truth for ACP Skills run controls and
their state semantics.

## State Axes

ACP Skills has four related but separate state axes:

- Run state: workflow/job progress such as `running`, `waiting_user`,
  `repairing`, `succeeded`, `failed`, and `canceled`.
- Connection state: local ACP conversation attachment such as `active`,
  `closed`, `ended`, and recovery availability.
- Prompt turn state: whether one ACP prompt call is currently active.
- Sequence state: parent `skillrunner.sequence.v1` orchestration state when the
  run is a sequence step.

These axes must not be collapsed into one user action.

## User Controls

### Cancel Current Turn

Canceling the current turn stops only the active ACP prompt call.

- It does not disconnect the ACP connection.
- It does not mark the run terminal.
- It leaves the run available for a later user prompt.
- Any assistant text returned after the turn was canceled is ignored for output
  validation, result-file fallback, and output repair.

The ACP Skills reply composer uses this action while a prompt turn is busy.

### Disconnect

Disconnecting detaches the local ACP connection.

- If a prompt turn is active, Host first stops that turn.
- It does not mark the run terminal.
- It leaves the run recoverable when the backend supports session recovery.
- Any assistant text returned after the disconnect request is ignored for output
  validation, result-file fallback, and output repair.

### Cancel Task

Canceling the task terminates the ACP Skills job.

- It stops the active prompt turn when one exists.
- It disconnects the ACP connection.
- It marks the run `canceled` and unavailable for recovery.
- If the run is a sequence step, the parent sequence stops and downstream steps
  must not start.

## Invariants

- Current-turn cancel and disconnect are recoverable pauses, not job terminal
  states.
- Only Cancel Task or a provider terminal canceled result may produce a terminal
  canceled run.
- Output convergence is allowed only for text returned by a live, non-stopped
  prompt turn.
- Repair prompts must never be generated from text captured after current-turn
  cancel or disconnect.
