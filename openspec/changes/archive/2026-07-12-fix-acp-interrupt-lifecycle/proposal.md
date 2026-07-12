## Why

ACP Chat and ACP Skills currently treat a successfully written `session/cancel` notification as proof that the active prompt has stopped. This lets the UI announce cancellation and accept new input while the external ACP backend may still be running, producing transcript updates, or completing with a non-cancelled result.

## What Changes

- Model prompt interruption as a lifecycle with requested, confirmed, forced, and unconfirmed outcomes instead of one optimistic cancelled transition.
- Keep the current prompt active after sending `session/cancel`, accept its protocol-permitted trailing updates, and wait for the original `session/prompt` result.
- Force-close only the current conversation/run adapter and process tree when cancellation remains unconfirmed for 10 seconds.
- Preserve a backend's non-cancelled result instead of disguising it as an acknowledged cancellation.
- Make ACP Skills recovery capability determine whether a force-stopped run remains recoverable or becomes terminal.
- Keep transcript-only updates isolated from Assistant Workspace chrome and managed drawer DOM.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `acp-chat-session-management`: Define confirmed and forced prompt interruption semantics for conversation-scoped ACP adapters.
- `acp-skills-interactive-execution`: Define interrupt confirmation, timeout cleanup, and recovery behavior for live and recovered skill runs.
- `acp-chat-performance-ui`: Preserve region-level DOM identity while cancellation-state and trailing transcript updates arrive independently.

## Impact

- Clarifies the adapter cancellation dispatch contract, renames the low-level client notification method, and adds prompt-interrupt state DTOs without changing the ACP wire protocol.
- Affects ACP Chat session management, ACP Skills orchestration/store projection, Assistant Workspace reply state, localization, and focused regression tests.
- Uses the existing adapter/transport close path; no dependency or persisted transcript format migration is required.
