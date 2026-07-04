## Why

ACP Chat now has a scoped durable transcript page reader, but the sidebar still
publishes full transcript items and the ACP Chat child still renders eagerly.
That leaves the pagination migration incomplete and keeps host snapshot payloads
larger than necessary.

This change connects the minimum page-rendering loop for ACP Chat without
changing the broader publication path. The host will send structural panel data
plus one selected transcript page, and the child will render only scope-matched
pages through the shared virtual transcript renderer.

## What Changes

- Add ACP Chat selected transcript page delivery to the assistant workspace
  sidebar.
- Use structural ACP Chat snapshots when transcript pagination virtualization is
  enabled.
- Teach the ACP Chat child to guard selected pages by backend/conversation scope
  before rendering.
- Route ACP Chat `load-transcript-page` child actions through the existing
  scoped page reader.

## Non-goals

- Do not add a second workspace UI subscription.
- Do not change `subscribeAcpFrontendSnapshots` or
  `subscribeAcpConversationSnapshots` semantics.
- Do not add session index caches, listener `itemMode` maps, or
  `notifyFrontend: false` delivery.
- Do not change ACP Skills or SkillRunner transcript rendering behavior.
- Do not implement ACP Chat live/background refresh filtering in this change.

## Impact

- `src/modules/assistantWorkspaceSidebar.ts`
- `addon/content/sidebar/acp-chat.js`
- `test/core/97-acp-ui-smoke.test.ts`
- `openspec/specs/acp-chat-file-backed-transcript-state/spec.md`
