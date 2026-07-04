## Why

ACP Chat has no first-class empty panel state when there is no stored chat
session, and the Assistant Workspace host currently initializes child panels
through the active tab. An empty ACP Chat store can therefore leave ACP Chat in a
half-initialized state and prevent ACP Skills or SkillRunner from receiving
their own initial snapshots.

## What Changes

- Add explicit ACP Chat panel availability states for no backend, backend with no
  conversation, and selected conversation.
- Keep the no-backend ACP Chat panel stable but disable backend/conversation
  selectors, new/connect/disconnect/auth/runtime/reply controls, transcript page
  loading, and empty-payload actions.
- Keep the backend-without-conversation ACP Chat panel stable, allow
  backend-only new/connect actions, and avoid transcript page reads until a
  conversation exists.
- Change Assistant Workspace child initialization so ACP Chat, ACP Skills, and
  SkillRunner child readiness and init snapshot publication are independent per
  tab instead of gated by the active tab.
- Keep backend refresh out of ordinary snapshot post paths; explicit shell
  lifecycle refresh may run in the background and settle with at most one
  no-refresh repost.
- Do not introduce `notifyFrontend:false`, listener `itemMode` maps, session
  index caches, untyped high-frequency conversation subscriptions, shared
  subscription tab restrictions, or full host-side snapshot JSON signatures.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `assistant-workspace-ui-refresh-governance`: child panel readiness and initial
  snapshot publication become per-tab, so one panel cannot block another panel
  during workspace initialization.
- `acp-chat-session-management`: ACP Chat defines stable no-backend and
  no-conversation panel states with explicit action availability.

## Impact

- Affects Assistant Workspace host/shell bridge initialization and child
  snapshot publication.
- Affects ACP Chat panel read-model DTOs and ACP Chat child/model control
  projection.
- Adds regression coverage for empty ACP Chat stores, no-backend ACP Chat
  stores, independent child init, and no-refresh snapshot paths.
