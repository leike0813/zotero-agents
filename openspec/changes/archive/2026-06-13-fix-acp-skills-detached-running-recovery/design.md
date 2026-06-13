# Design

## Detached Recoverable Run Detection

A run is classified as a detached recoverable running run when all of the
following hold:

- `status` is `running`, `repairing`, or recoverable `failed`
- `sessionId` is present
- `conversationState` is `closed`
- `conversationRecoveryState` is `available`
- `activePrompt` is false

This derivation uses existing persisted fields. No new state machine states
are introduced.

## Panel Projection

Detached recoverable runs are projected as attention-required reconnect states
rather than active busy prompt turns. The panel shows that user action is
required and the composer does not emit current-turn interrupt for these runs.

## Connect Triggers Recovered Continuation

When the user explicitly connects a detached recoverable run:

1. Host attaches the existing ACP session.
2. If the run has workflow output convergence context and no pending user
   interaction or pending permission request, Host sends the recovered
   continuation guard prompt.
3. If a pending user interaction or pending permission request exists, Host
   attaches the session but does not send an automatic continuation prompt.
   The run remains user-actionable.

Output validation, result-file fallback, repair, pending interaction, final
apply, and sequence continuation follow the existing recovered continuation
behavior.

## Current-Turn Cancel Preserves Session

When the user cancels the current turn from the composer after recovery,
Host stops the active ACP prompt call but the ACP session controller remains
attached. The run stays non-terminal and recoverable for later prompts.
