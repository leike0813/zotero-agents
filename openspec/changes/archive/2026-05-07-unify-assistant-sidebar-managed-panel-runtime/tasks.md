# Tasks

## 1. OpenSpec Artifacts

- [x] Create proposal, design, tasks, and delta specs for the unified Assistant managed panel runtime.
- [x] Reference `doc/components/assistant-sidebar-panel-ui-ssot.md` as the design SSOT.
- [x] Reference `artifact/assistant_sidebar_ui_refactor_plan_20260502.md` as the implementation plan source.

## 2. Assistant Shell

- [x] Set user-facing tab order to `ACP Chat / ACP Skills / SkillRunner`.
- [x] Keep one visible Assistant sidebar entry.
- [x] Route legacy open APIs to the unified shell and requested tab.
- [x] Keep shell-level bridge and snapshot replay behavior.

## 3. Shared UI Runtime

- [x] Add namespaced shared CSS foundation for Assistant panels.
- [x] Add ACP shared `AssistantConversationView` projection.
- [x] Add ACP shared transcript renderer.
- [x] Add `AssistantPanelSnapshot` projection helpers.
- [x] Add managed panel renderer for toolbar, banner, plan, hint, reply, context drawer, and details drawer.

## 4. ACP Chat Migration

- [x] Move Plain/Bubble view switch into conversation overlay.
- [x] Keep Sessions as all-backend/all-conversation drawer.
- [x] Limit conversation selector to current backend sessions.
- [x] Add `Show more...` behavior for large current-backend session lists.
- [x] Ensure New conversation action carries selected `backendId`.
- [x] Remove child-page sidebar close button from main ACP Chat UI.
- [x] Route managed panel actions back to existing ACP Chat host bridge actions.

## 5. ACP Skills Migration

- [x] Rework ACP Skills page to six-region panel model.
- [x] Route toolbar, banner, plan, hint, reply, drawers, and details through managed renderer.
- [x] Keep run store, recovery, permission, applyResult, and workflow result contracts unchanged.
- [x] Preserve `reply-run`, `connect-run`, `disconnect-run`, `end-session`, `cancel-run`, and `resolve-permission` action envelopes.
- [x] Display output revisions in details/diagnostics, not normal transcript rows.

## 6. SkillRunner Managed Runtime Migration

- [x] Replace the visible `run-dialog` scaffold with managed six-region mounts.
- [x] Project SkillRunner workspace/session snapshots into full `AssistantPanelSnapshot` objects.
- [x] Render SkillRunner toolbar, banner, hint, reply, context drawer, and details through `AssistantPanelRenderer`.
- [x] Preserve SkillRunner Sessions drawer Running/Completed sections, backend groups, task-card styling, and Completed collapse semantics inside the managed drawer shell.
- [x] Map SkillRunner transcript messages into `AssistantConversationView` and shared transcript rendering.
- [x] Preserve waiting_user reply, waiting_auth reply, auth import, cancel, drawer, and task selection host actions.
- [x] Preserve assistant revision/replacement as SkillRunner-owned metadata and details diagnostics.
- [x] Keep backend protocol, output convergence, and host dispatch semantics unchanged.

## 7. Validation

- [x] Run static JS checks for shared runtime and panel pages.
- [x] Run ACP UI smoke tests.
- [x] Run ACP SkillRunner-compatible runner tests.
- [x] Run SkillRunner UI regression tests.
- [x] Run TypeScript type check.

## 8. Migration Closure Hardening

- [x] Remove ACP Chat visible legacy picker, composer, session drawer, permission drawer, and diagnostics DOM paths.
- [x] Make ACP Chat use managed reply controls for mode, model, reasoning, usage, and send/cancel.
- [x] Preserve ACP backend runtime option cache when connect/attach returns empty mode/model option arrays.
- [x] Keep managed selector payloads typed with `modeId`, `modelId`, `effortId`, `backendId`, and `conversationId`.
- [x] Keep ACP Chat Plain/Bubble preference action routed through the existing host bridge.
- [x] Add smoke coverage that rejects ACP Chat visible legacy controls and covers primitive/string selector options.

## 9. Reply Zone And Usage Gauge Closure

- [x] Render managed reply zones as textarea plus footer.
- [x] Split reply footer into `primary`, `controls`, and `secondary` groups.
- [x] Keep Send/Cancel in the leftmost `primary` group for all three panels.
- [x] Keep ACP Chat mode/model/reasoning selectors in the footer `controls` group.
- [x] Keep ACP Chat and ACP Skills usage gauges visible in the footer `secondary` group.
- [x] Render usage as compact `k` labels such as `16k/256k`, or `N/A` when no usage data exists.
- [x] Keep ACP Skills and SkillRunner keyboard shortcut hints visible through the managed reply footer.
- [x] Centralize reply textarea styling in shared panel CSS and avoid page-local visual overrides.
