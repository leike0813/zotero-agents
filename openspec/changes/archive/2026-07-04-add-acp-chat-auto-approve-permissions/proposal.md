## Why

ACP Chat can receive frequent ACP tool permission prompts during ordinary chat
sessions. ACP Skills already offers opt-in auto-approval for standard ACP tool
permissions; ACP Chat needs the same convenience while keeping the setting
scoped to the current conversation.

## What Changes

- Add a conversation-scoped ACP Chat auto-approval setting, defaulting to off.
- Automatically resolve standard ACP tool-call permission requests when that
  setting is enabled.
- Show the setting as a banner control alongside ACP Chat connection actions.
- Preserve manual approval for non-standard permissions and non-ACP-tool
  permission channels.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `acp-chat-session-management`: ACP Chat conversations persist an
  auto-approval setting and apply it to standard ACP tool-call permission
  requests.
- `assistant-sidebar-ui`: ACP Chat exposes the auto-approval setting in the
  banner action row.

## Impact

- ACP Chat session snapshot and persistence shape.
- ACP Chat permission request handling in `acpSessionManager`.
- Shared Assistant panel ACP Chat projection and sidebar action routing.
- ACP Chat UI smoke tests and session-manager permission tests.
