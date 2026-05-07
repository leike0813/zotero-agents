# Assistant Sidebar UI Refactor Plan - 2026-05-02

## Summary

This plan implements the Assistant sidebar panel UI SSOT documented in
`doc/components/assistant-sidebar-panel-ui-ssot.md`.

The refactor keeps the unified tab shell, changes the user-facing tab order to
`ACP Chat / ACP Skills / SkillRunner`, aligns panel layout around six semantic
regions, and reduces duplicated ACP UI styling. Conversation unification now
includes the hint widget and output convergence rules because pending messages,
`ui_hints`, and repair/revision behavior are coupled.

The implementation order is ACP-first, then SkillRunner is fully migrated into
the same managed panel runtime. SkillRunner keeps backend protocol,
output-convergence, reply/cancel, auth, and observation semantics, but
`run-dialog` no longer owns an independent visible layout or duplicate control
system.

This plan is documentation-only for the current step. Code changes should be
implemented in a later change. Top-level controls are split into shell toolbar
actions, current context selectors, current context actions, and conversation
window rendering preferences.

## Phase 1: Shell Consolidation

- Update `assistant-workspace` tab order to `ACP Chat`, `ACP Skills`,
  `SkillRunner`.
- Make all three tabs equal width and visually behave like traditional tabs.
- Remove user-visible legacy sidebar buttons for separate ACP Chat, ACP Skills,
  and SkillRunner panels.
- Make the unified Assistant shell the owner of sidebar close. Child ACP Chat,
  ACP Skills, and SkillRunner panels should not expose independent sidebar close
  semantics when hosted in the shell.
- Keep existing open functions as compatibility APIs, but route them through the
  Assistant shell and activate the target tab.
- Preserve the shell bridge contract for action forwarding and snapshot replay.

Acceptance checks:

- One Assistant sidebar entry is visible.
- Opening any old panel entry point focuses the unified shell.
- The requested tab becomes active without opening an independent sidebar.

## Phase 2: Shared UI Foundation

- Introduce shared CSS tokens or utility classes for panel shell, shell toolbar,
  context selector, context action cluster, banner, conversation, conversation
  overlay menu, plan, hint, reply, button, chip, LED, code surface, and drawer
  surfaces.
- Keep implementation as static HTML/CSS/JS; do not introduce a frontend
  framework or complex runtime component system.
- Avoid renaming large sets of selectors unless the rename removes real
  duplication or clarifies the six-region model.

Acceptance checks:

- ACP Chat and ACP Skills use shared visual primitives for comparable controls.
- Existing markdown, KaTeX, permission drawer, and bridge behavior still works.
- No SkillRunner behavior changes are required to consume the shared tokens.

## Phase 3: ACP Chat Context Controls

- Keep the all-backend `Sessions` drawer as the global conversation management
  entry.
- Keep the current-backend conversation dropdown, but limit it to conversations
  from the selected backend.
- Add bounded dropdown behavior for large current-backend session lists: show
  recent conversations plus `Show more...`; selecting `Show more...` opens the
  session drawer focused on the current backend group.
- Keep the top-level `+` action bound to the currently selected backend.
- Add any cross-backend new-conversation flow inside the all-session drawer, not
  in the top-level `+`.
- Move ACP Chat connect/disconnect/authenticate into the current context action
  cluster; they are not shell-global actions.
- Present connection state as current context metadata in the banner.
- Replace any dedicated `Plain / Bubble` control row with a conversation window
  top-right overlay menu.

Acceptance checks:

- `Sessions` shows all backend conversations, while the dropdown shows only the
  current backend's conversations.
- `Show more...` opens the drawer and focuses the current backend.
- `+` creates a conversation in the selected backend.
- Connect/disconnect visually bind to the current backend/session.
- Plain/Bubble switching does not occupy a standalone row.

## Phase 4: ACP Chat and ACP Skills Shared Conversation + Hint Model

- Define a shared ACP view adapter that projects both ACP Chat session snapshots
  and ACP Skills run snapshots into `AssistantConversationView`.
- Keep ACP Chat conversation store and ACP Skills run store separate; the shared
  adapter is a UI projection layer only.
- Move shared projection logic out of page-specific rendering where practical:
  tool normalization, `process` items, plan extraction, usage projection, and
  hint interaction priority.
- Map both ACP panels to the six-region layout:
  `shell toolbar`, `banner`, `conversation window`, `plan widget`,
  `hint widget`, `reply zone`.
- Move ACP Chat running/hint visuals toward the ACP Skills spinner and hint
  treatment.
- Move ACP Skills plan rendering toward ACP Chat rules: terminal plan hidden,
  status icons only, compact rows, bounded height.
- Keep ACP Chat conversation store and ACP Skills run store separate.
- Keep ACP Chat-specific reply controls: mode, model, reasoning effort, usage
  gauge.
- Keep ACP Skills reply zone simpler: text reply, send, shortcut/status hint.
- Treat ACP `agent_thought_chunk` and ACP Skills validation or repair process
  notes as the same `process` kind; do not maintain separate thought/reasoning
  UI concepts.

Acceptance checks:

- Permission remains highest-priority hint state in both ACP panels.
- ACP disconnected/error state is visible and does not look like a waiting reply.
- Plan widget height is capped and does not over-compress the conversation area.
- Tool rows use consistent LED/badge/summary styling across ACP panels.
- ACP Chat and ACP Skills can both be rendered from
  `AssistantConversationView` without sharing persistence stores.

## Phase 5: ACP Skills Output Projection And Revision Trail

- Keep pending/final envelope interpretation in ACP Skills output convergence,
  not in generic ACP Chat rendering.
- Project valid pending envelope `message` into the latest canonical assistant
  message.
- Use pending `ui_hints` only for the hint widget; do not repeat the pending
  message as a banner or notice.
- Project valid final envelopes into the canonical assistant message after
  removing the `__SKILL_DONE__` marker.
- Record invalid candidates, repair rounds, schema errors, and replacement
  reasons as a revision trail attached to the canonical message.
- Keep replaced candidates out of the main transcript; expose them through a
  compact revision badge and details/diagnostics.
- Preserve revision trail through recovery so a disconnected interactive run
  does not lose output convergence context.

Acceptance checks:

- Pending message appears once in the conversation window.
- `ui_hints.prompt`, `ui_hints.hint`, and `ui_hints.options` drive only the hint
  widget controls.
- A repaired ACP Skills turn displays one canonical assistant message and keeps
  rejected candidates in diagnostics.
- ACP Chat does not expose ACP Skills revision concepts.

## Phase 6: SkillRunner Managed Runtime Migration

- Replace the visible `run-dialog` scaffold with the same managed six-region
  mount model used by ACP Chat and ACP Skills.
- Project SkillRunner workspace/session snapshots into full
  `AssistantPanelSnapshot` objects: toolbar, banner, context drawer, details,
  conversation, interaction, reply, and context actions.
- Map SkillRunner `assistant_message`, `assistant_final`,
  `assistant_revision`, and `assistant_process` to `AssistantConversationView`.
- Preserve SkillRunner native revision/replacement audit semantics as
  SkillRunner-owned transcript metadata and details diagnostics.
- Keep original SkillRunner action payloads for waiting-user replies,
  waiting-auth replies, auth import, cancel, drawer toggle, drawer close, and
  task selection.
- Keep page-local FileReader logic for auth import files, but render visible
  auth import controls via shared managed hint/reply controls.
- Delete old `run-dialog` card, drawer, prompt/auth/final, reply, and `.btn`
  visual systems after equivalent managed controls are in place.

Acceptance checks:

- SkillRunner waiting-user reply still reaches the backend.
- Auth import and cancel behavior remain unchanged.
- Sessions drawer can open and close in shell-hosted sidebar mode.
- SkillRunner conversation remains the dominant visible area.
- SkillRunner native replacement/revision behavior is still visible or
  inspectable after adaptation.

## Phase 7: Unified Transcript Renderer

- Use one transcript renderer DOM vocabulary for ACP Chat, ACP Skills, and
  SkillRunner: `assistant-transcript-row`, `assistant-transcript-meta`,
  `assistant-transcript-body`, `assistant-transcript-tool-*`, and
  `assistant-transcript-revision-badge`.
- Express panel source and row semantics with `data-assistant-panel-kind`,
  `data-assistant-item-kind`, and `data-assistant-role`; do not use page-private
  transcript row classes as the primary styling contract.
- Move Plain/Bubble row, metadata, markdown body, tool LED, tool activity,
  revision badge, empty-state, and scroll spacing styles into the shared panel
  CSS foundation.
- Keep ACP Chat, ACP Skills, and SkillRunner adapter differences in projected
  item data and metadata, not in separate transcript DOM/CSS branches.
- Preserve markdown/math callbacks, tool grouping, scroll anchoring, and
  SkillRunner/ACP Skills revision metadata behavior.

## Phase 8: Migration Closure Hardening

- Remove ACP Chat visible legacy picker, composer, session drawer,
  status-detail, and diagnostics DOM paths from the normal UI. ACP Chat
  non-transcript regions are managed-only.
- Keep ACP Chat mode/model/reasoning controls in the managed reply zone, backed
  by the same snapshot runtime options used by the ACP session manager.
- Preserve backend runtime options when ACP connect/attach returns empty
  `availableModes` or `availableModels`; empty attach results must not clear a
  valid backend cache.
- Keep selector actions typed: managed selector payloads include `modeId`,
  `modelId`, `effortId`, `backendId`, or `conversationId` as appropriate, in
  addition to generic `value`.
- Keep usage gauge rendering in the managed ACP Chat reply zone.
- Render reply zones as a shared textarea plus footer structure. The footer uses
  `primary / controls / secondary` groups, with Send/Cancel fixed in the
  leftmost `primary` group.
- Keep ACP Chat mode/model/reasoning selectors in the footer `controls` group,
  not above the input textarea.
- Keep usage gauges visible for ACP Chat and ACP Skills. No usage data renders
  as `N/A`; known usage renders in `k` units such as `16k/256k` and never uses
  the literal `Usage` label.
- Keep ACP Skills shortcut/status text in the reply footer and add the managed
  usage gauge to the footer's right side.
- Keep SkillRunner shortcut/status text in the reply footer without forcing a
  usage gauge unless compatible usage data is later added.
- Verify ordinary buttons use the shared rectangular radius across ACP Chat, ACP
  Skills, and SkillRunner; pill radius remains limited to status/metadata chips.
- Verify Plain/Bubble switching is available in all three panels and is rendered
  as a conversation overlay.
- Verify all three panels use the same transcript DOM vocabulary and shared
  transcript CSS; page CSS may only keep container layout or minor
  adapter-specific adjustments.

Acceptance checks:

- ACP Chat no longer double-writes visible banner/hint/reply/drawer/details
  regions from legacy builders.
- ACP Chat selectors remain populated before and after connect when backend
  runtime options cache is available.
- ACP Chat and ACP Skills usage gauges remain visible in the reply footer and
  use `N/A` or compact `k` labels.
- Send/Cancel buttons appear at the left edge of the reply footer in all three
  panels.
- ACP Skills and SkillRunner reply footers show keyboard shortcut hints through
  the shared managed renderer.
- ACP Skills and SkillRunner drawers keep their pre-migration selection/open-close
  semantics while using the shared drawer shell.
- Static smoke tests reject reintroduction of ACP Chat visible legacy picker and
  drawer IDs.

## Test Plan

UI smoke tests:

- Assistant shell exposes one visible sidebar entry and three equal-width tabs in
  the order `ACP Chat / ACP Skills / SkillRunner`.
- Legacy panel open APIs route to the unified shell and activate the expected
  tab.
- ACP Chat and ACP Skills contain the six semantic regions.
- ACP Chat shell toolbar, context selector, context action, and conversation
  overlay controls have distinct DOM/style roles.
- ACP Chat `Sessions` drawer shows all backend conversations; current
  conversation dropdown shows only the active backend.
- ACP Chat current-backend conversation dropdown exposes `Show more...` when
  needed and opens the session drawer.
- ACP Chat `+` creates a conversation under the selected backend.
- ACP Chat and ACP Skills use matching plan, hint, tool LED, permission, and
  reply-zone behavior.
- ACP Chat and ACP Skills use the shared `AssistantConversationView` projection
  model while keeping separate stores.
- ACP Skills pending output renders `message` in the conversation and uses
  `ui_hints` only for hint controls.
- ACP Skills repair/revision data is visible through diagnostics/details and is
  not rendered as duplicate normal messages.
- SkillRunner tab still loads `run-dialog.html`, but the page contains only
  managed six-region mounts and required script/style references.
- SkillRunner sessions are rendered by the shared context drawer.
- Plain/Bubble switching is rendered as a conversation window overlay menu, not
  as a standalone control row.

Interaction regression tests:

- ACP Chat permission drawer, MCP indicator, usage gauge, mode/model/reasoning
  controls, and send action still work.
- ACP Chat connect/disconnect/authenticate target the current backend/session,
  not the Assistant shell.
- ACP Skills reply, connect, disconnect, permission resolution, cancel, and end
  session actions still reach the host bridge.
- ACP Skills connect/disconnect/end/cancel target the selected run context.
- SkillRunner waiting-user reply, auth import, auth method selection, auth
  code/API key reply, task selection, drawer toggle/close, and cancel still
  reach the existing SkillRunner dispatch path through the Assistant shell
  bridge.
- SkillRunner native assistant revision/replacement behavior remains intact.

Manual visual checks:

- Toolbar, banner, plan, hint, and reply zone heights remain stable in a narrow
  Zotero sidebar.
- Conversation window receives most available vertical space.
- Running, waiting, permission, disconnected, and completed states look
  consistent across ACP Chat and ACP Skills.
- SkillRunner is visually compatible but not behaviorally rewritten.

## Assumptions

- This step only creates documentation artifacts.
- SkillRunner's backend protocol and state semantics are stable baselines; its
  visible sidebar layout and controls are migrated into the managed runtime.
- "Global" means Assistant shell or panel-level behavior only; current
  backend/session/run lifecycle controls are context actions.
- ACP Chat keeps the current model where one backend has one active slot/session,
  while different backends may have independent session state.
- Cross-backend new conversation creation belongs in the all-session drawer.
- Unified transcript rendering is part of this refactor. The shared
  conversation view model, transcript renderer, and hint model are all UI
  runtime facade layers, not persistence models.
- The implementation will use current dashboard HTML/CSS/JS and will not add a
  new frontend framework.
