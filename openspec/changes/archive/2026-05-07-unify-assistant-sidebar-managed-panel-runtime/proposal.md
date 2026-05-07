# Unify Assistant Sidebar Managed Panel Runtime

## Why

The Assistant sidebar has grown from separate SkillRunner, ACP Chat, and ACP Skills panels into a shared product surface, but the UI and interaction governance have been scattered across separate pages. This makes visual alignment fragile, makes ACP Chat, ACP Skills, and SkillRunner diverge, and risks accidental regressions such as reintroducing child-panel close buttons or duplicating drawer/reply/hint controls.

This change records the unified Assistant sidebar UI/UX work as a formal OpenSpec change. It follows the SSOT in `doc/components/assistant-sidebar-panel-ui-ssot.md` and the implementation plan in `artifact/assistant_sidebar_ui_refactor_plan_20260502.md`.

## What Changes

- Consolidate the user-facing Assistant sidebar into one tab shell with fixed tab order: `ACP Chat / ACP Skills / SkillRunner`.
- Introduce shared ACP UI runtime primitives:
  - `AssistantConversationView` for ACP Chat, ACP Skills, and SkillRunner transcript projection.
  - shared transcript renderer for ACP Chat, ACP Skills, and SkillRunner.
  - `AssistantPanelSnapshot` and managed panel renderer for toolbar, banner, plan, hint, reply, context drawer, and details drawer.
  - namespaced shared CSS foundation for tokens, controls, drawers, indicators, and surfaces.
- Govern ACP Chat context controls:
  - current backend selector, current-backend conversation selector, New, connect/disconnect/authenticate as banner context controls.
  - all-backend Sessions drawer remains a toolbar-level entry.
  - current-backend conversation dropdown is bounded and uses `Show more...` to open the drawer.
  - Plain/Bubble view switch moves into the conversation window overlay.
- Govern ACP Skills page and output display:
  - ACP Skills uses the same six-region panel model as ACP Chat.
  - Runs and Details are toolbar actions.
  - Connect/Disconnect/End/Cancel are current-run context actions.
  - pending `ui_hints` drive hint controls, while pending `message` is projected into the transcript.
  - invalid/replaced output candidates are shown through revision diagnostics, not as normal transcript messages.
- Govern shared reply zones:
  - managed reply zones render as textarea plus footer.
  - Send/Cancel stays in the leftmost footer group.
  - ACP Chat mode/model/reasoning selectors and usage gauge stay in the footer.
  - ACP Skills shows shortcut/status text and a managed usage gauge in the footer.
  - usage labels are compact token counts such as `16k/256k`, or `N/A` when no usage is available.
- Migrate SkillRunner into the managed runtime:
  - `run-dialog` uses the same six-region managed mount model as the ACP panels.
  - SkillRunner snapshots project into `AssistantPanelSnapshot`.
  - waiting_user/auth/cancel/task-selection actions keep their existing host dispatch semantics.
  - native assistant revision/replacement semantics are preserved as SkillRunner-owned transcript metadata and details diagnostics.

## Capabilities

### New Capabilities

None. This change consolidates and tightens existing Assistant sidebar, bridge, and ACP Skills interactive UI capabilities.

### Modified Capabilities

- `assistant-sidebar-ui`: unified shell, six-region model, managed ACP panel runtime, shared ACP transcript rendering, and SkillRunner adaptation boundary.
- `assistant-shell-interaction-bridge`: action routing and bridge semantics for the unified shell after managed rendering.
- `acp-skills-interactive-execution`: ACP Skills pending/final envelope projection and revision trail display semantics.

## Impact

- Affects dashboard sidebar UI files, ACP Chat/ACP Skills frontend adapters/renderers, Assistant shell routing, ACP Skills run transcript/revision projection, and UI smoke tests.
- Does not merge ACP Chat store, ACP Skills run store, or SkillRunner history.
- Replaces SkillRunner's independent visible layout/control system with managed panel rendering, without changing SkillRunner backend protocol.
- Does not change workflow-facing `skillrunner.job.v1` contracts.
