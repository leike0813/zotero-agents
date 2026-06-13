# Fix ACP Skills Detached Running Recovery

## Summary

ACP Skills can currently restore a run as `running` but disconnected after
Zotero shutdown. The panel treats that record as an active busy prompt even
though no prompt is running, so the composer only exposes current-turn cancel
and the user cannot resume the run.

This change keeps the existing persisted state model and derives a recoverable
detached-running UI state from `status`, `conversationState`,
`conversationRecoveryState`, `sessionId`, and `activePrompt`. User-initiated
Connect attaches the session and starts the existing recovered continuation
guard when the run has workflow output convergence context and no pending user
interaction.

## Why

- Prevent recoverable ACP Skill runs from being trapped in a disconnected
  busy UI.
- Preserve explicit user control: plugin startup does not automatically connect
  remote sessions.
- Keep current-turn cancel, disconnect, and task cancellation separate.

## Impact

- ACP Skills state-machine spec and SSOT documentation.
- ACP Skills panel projection for detached recoverable runs.
- Recovered ACP session controller semantics and connect continuation behavior.
