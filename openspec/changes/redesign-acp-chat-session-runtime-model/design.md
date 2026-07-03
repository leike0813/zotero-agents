# Design

## Chosen Model

ACP Chat uses session-keyed runtimes: `backendId + conversationId`. A runtime owns the adapter, live `sessionId`, persisted `remoteSessionId`, status, permission state, diagnostics, and transcript mirror for one local chat session. Backend records only provide configuration and grouping.

Foreground selection is `activeBackendId + activeConversationId`. Selecting a session changes only the foreground target. It must not disconnect, cancel, or otherwise mutate the previously foreground session.

## Runtime Rules

- New session creates a persisted local conversation and foregrounds it without disconnecting any existing session.
- Connect, disconnect, prompt, cancel, auth, permission, mode/model/reasoning actions target the explicit session payload. Missing ids resolve only to the foreground session.
- Connected and prompting sessions keep their full mirror even in the background.
- Foreground sessions keep their mirror. If selected cold, they publish `transcriptState.loading` immediately and hydrate from JSONL in the background.
- Disconnect clears the live `sessionId`, keeps `remoteSessionId`, and sets the session idle. If it remains foreground, the current mirror remains visible and no hydrate is triggered.
- Idle non-foreground sessions may release mirror data and hydrate again when selected.

## Live Adapter Cap

ACP Chat keeps the existing cap of three live adapters. Opening another live session disconnects the least recently used idle live session. If all live sessions are prompting or waiting on permission, the new connection is rejected and existing sessions remain unchanged.

## Rejected Approaches

The old backend-slot model is rejected. It makes the current backend own all live ACP Chat state and forces unrelated sessions under the same backend to block each other.

Keeping hidden compatibility shims for backend-owned adapters is also rejected. Actions must resolve to a concrete session runtime or fail clearly.
