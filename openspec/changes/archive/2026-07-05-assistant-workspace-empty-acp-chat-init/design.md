## Context

ACP Chat now has a panel read-model, but an empty ACP Chat store still exposes a
normal-looking snapshot with no selected conversation. The child panel can avoid
loading a transcript, but the toolbar and host action contract do not know
whether the missing scope means "no backend" or "backend selected, no
conversation".

Assistant Workspace also initializes child panels through the active tab. The
shell loads all three child frames, but the host ignores ready events for
inactive tabs and posts scheduled snapshots only for the active tab. Since ACP
Chat is the default tab, ACP Chat empty-state failures can prevent ACP Skills
and SkillRunner from receiving init snapshots.

## Goals / Non-Goals

**Goals:**

- Make ACP Chat empty states explicit in the read-model and child projection.
- Allow a complete no-backend ACP Chat empty state with all controls disabled.
- Allow a backend-without-conversation ACP Chat empty state with backend-only
  new/connect actions.
- Initialize ACP Chat, ACP Skills, and SkillRunner child frames independently.
- Keep backend refresh out of ordinary snapshot, page request, and child action
  repost paths.

**Non-Goals:**

- Do not change ACP Chat write-side session creation, streaming events, or jsonl
  persistence.
- Do not continue ACP Chat transcript pagination beyond the current selected
  page path.
- Do not add `notifyFrontend:false`, listener `itemMode` maps, session index
  caches, untyped high-frequency conversation subscriptions, or host-side full
  snapshot JSON signatures.

## Decisions

1. Represent empty ACP Chat states in the panel DTO.

   `prepareAcpChatPanelSnapshot()` will expose
   `backendAvailability: "none" | "selected"` and
   `conversationAvailability: "none" | "selected"`. The DTO remains a normal
   panel snapshot so the child can render toolbar/banner/empty content without
   special host delivery.

2. Treat no backend as a disabled panel, not as an implicit fallback backend.

   The read-model will not invent an active backend when the backend registry has
   no ACP backend. The panel may still expose diagnostics/backend-manager entry
   points, but ACP Chat conversation controls and reply controls are disabled and
   child actions with empty backend payloads are not emitted.

3. Treat backend without conversation as a valid backend-level state.

   The panel will not read a transcript page without a selected conversation.
   New conversation and connect actions are allowed with only `backendId`; other
   conversation/session-specific controls remain disabled until a conversation
   exists.

4. Make child readiness per-tab.

   The host will record ready state for ACP Chat, ACP Skills, and SkillRunner
   separately. A child ready event publishes that tab's init snapshot even when
   it is not the active tab. Scheduled runtime refreshes may remain active-tab
   bounded, but initialization is not.

5. Split lifecycle refresh from snapshot posting.

   Shell load/ready/target commit may request backend refresh in the background,
   but they first publish no-refresh snapshots. When refresh settles, the host
   coalesces to at most one no-refresh repost. Ordinary snapshot paths and page
   requests do not call backend refresh.

## Risks / Trade-offs

- [Risk] Hidden tabs receive init snapshots and do slightly more startup work.
  -> Init snapshots are bounded and necessary to avoid static child shells; high
  frequency runtime refresh remains filtered.
- [Risk] Completely empty backend state could hide recovery actions.
  -> Backend manager remains available through existing panel actions; ACP Chat
  session controls are disabled because they have no valid backend target.
- [Risk] Refresh settle repost can race with tab switches.
  -> Repost uses the same no-refresh tab posting and existing build guards; it
  does not re-enter backend refresh.
