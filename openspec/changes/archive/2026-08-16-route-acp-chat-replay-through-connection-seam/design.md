## Context

`acpSessionManager` exposes `prepareSyntheticAcpChatReplay`,
`activateSyntheticAcpChatReplay`, `applySyntheticAcpChatReplaySessionUpdate`,
`applySyntheticAcpChatReplayPrompt`, `applySyntheticAcpChatReplayPermission`,
`drainSyntheticAcpChatReplay`, `cleanupSyntheticAcpChatReplay`, and
`inspectSyntheticAcpChatReplayTimers`. `acpRuntimeReplayTargets` uses these
functions to mutate session runtime state directly instead of crossing the
`AcpConnectionAdapter` seam already used by production connections and tests.

## Goals / Non-Goals

**Goals:**

- Route ACP Chat replay events through one adapter seam.
- Remove replay vocabulary and replay state from `acpSessionManager`.
- Preserve replay profiler observable behavior and timer-inspection fidelity.
- Keep the existing global test adapter-factory hook working.

**Non-Goals:**

- Changing ACP adapter protocol types.
- Changing ACP Skill Run replay targets in this pass.
- Persisting replay targets or adapter registrations.
- Removing `sendAcpConversationPrompt` or other production host actions.

## Decisions

### Scoped adapter factory registry with backend admission

`acpSessionManager` gains `registerAcpConnectionAdapterFactory({ backend,
conversationId?, factory })` and
`unregisterAcpConnectionAdapterFactory(backendId, conversationId?)`.
Registrations are scoped by backend id with optional conversation precision.
`refreshAcpBackends` appends registered backends to `cachedAcpBackends` but
does not auto-select a scoped-only backend. Adapter selection checks the
conversation-scoped registration, then the backend-scoped registration, then
the default factory (real adapter or the `ForTests` override).

### Synthetic adapter module

New `acpSyntheticConnectionAdapter.ts` owns listener sets, session identity,
permission resolution, diagnostics emission, and adapter-side timer inspection.
It exposes `inspectAcpSyntheticConnectionAdapterTimers` backed by an in-memory
registry of active synthetic adapters. Session runtime timers are still owned
by `acpSessionManager`, so the replay-specific inspector becomes a generic
`inspectAcpChatSessionTimers` seam. `acpSessionManager` never imports the
synthetic adapter module.

### Deterministic replay session identity

`createAcpRuntimeReplayOwnerIdentity` gains `chat.sessionId`. The replay owner
mapper maps the first conversation session to that deterministic id. The
synthetic adapter creates its session with the same id, so later
`handleSessionUpdate` identity checks pass.

### Replay event mapping

- `turn-start`: synthetic adapter emits `user_message_chunk`; ACP Chat
  transcript handling gains generic support for that update kind.
- `session-notification`: emitted through `onUpdate`.
- `permission-request`: emitted through `onPermissionRequest`; the adapter
  keeps the resolve callback. `permission-outcome` and `terminal` call the
  standard `resolveAcpConversationPermission` host path, which removes the
  queued request and invokes the stored adapter resolver. Terminal defaults
  to cancel.
- `diagnostic`: emitted through `onDiagnostics`.
- `connection-close`: remains `consumed-noop`; `request-start/end` remain
  `unknown`.

### Replay target owns activation and cleanup

The chat replay target connects the synthetic conversation at creation,
activates `acp-replay` through `setActiveAcpBackend` +
`setActiveAcpConversation` + `connectAcpConversation`, and chains its lease
through the previously active synthetic lease so stale targets cannot overwrite
a newer owner. Cleanup runs `disconnectAcpConversation`,
`deleteActiveAcpConversation`, then unregisters the scoped factory and restores
the chained previous owner when the target still owns the lease.

## Risks / Trade-offs

- [Full connect path is heavier] -> Replay now exercises workspace preparation
  and connection setup; this is intentional coverage and is measured by the
  replay profiler suite.
- [Registered backends are in-memory only] -> The registry resets with the
  session manager; no persistence or backend registry mutation.
- [user_message_chunk changes chat transcript behavior] -> The update kind is
  already part of the ACP protocol and the Skill Run transcript path; adding
  Chat support aligns the two surfaces.
- [Permission replay may surface queue behavior] -> Synthetic permission
  requests use the standard queue and resolve path, replacing direct snapshot
  writes.

## Migration Plan

1. Add adapter and session-manager seam tests.
2. Implement `acpSyntheticConnectionAdapter.ts` and the scoped factory
   registry plus backend admission.
3. Add ACP Chat `user_message_chunk` transcript handling.
4. Migrate replay identity, owner mapping, replay targets, and production
   logical-time ports.
5. Delete replay-specific session-manager exports and state; rewrite direct
   lifecycle tests.
6. Run focused ACP/replay tests, type checks, lint, and spec updates.
