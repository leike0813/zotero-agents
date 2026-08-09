## Why

After a first ACP backend is saved, ACP Chat receives the updated backend
catalog but its shared panel model treats the valid backend-without-conversation
state as if no backend existed. The backend selector is therefore emptied and
the user cannot create or connect a conversation until the plugin restarts.

## What Changes

- Preserve configured ACP backend options when no ACP Chat conversation is
  selected, while keeping conversation-scoped controls unavailable.
- Enable New Conversation and Connect for the selected backend in that state.
- Route Connect through the selected navigation group and materialize or reuse a
  persistent local conversation before opening the ACP connection.
- Keep the selected local conversation after connection failure so diagnostics
  remain visible and the user can retry without restarting.
- Align the Assistant panel empty-state contract with ACP Chat's existing
  no-backend, backend-only, and selected-conversation states.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `acp-chat-session-management`: Define first-use backend availability and the
  local conversation lifecycle for backend-level Connect.
- `assistant-sidebar-ui`: Distinguish no-backend chrome from the
  backend-without-conversation projection and route backend-level actions
  through the selected navigation group.

## Impact

The change affects the ACP Chat panel projection, the shared Assistant action
contract, and focused core/UI regression tests. It does not change backend
persistence, backend registry refresh, ACP Chat connection ownership,
transcript storage, external APIs, dependencies, or localization.
