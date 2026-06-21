## Why

Zotero now shows a periodic soft jank when the plugin is loaded with many
SkillRunner runs retained. The immediate trigger is a background dashboard
refresh, but the underlying risk is broader: long-lived timers can read
unscoped, heavy, or ever-growing runtime stores on Zotero's main thread.

This change establishes strict scope and read-budget governance for long-lived
background refresh work while preserving existing visible UI behavior.

## What Changes

- Add a background refresh governance contract for long-lived timers.
- Require every long-lived timer to declare its owner, activation condition,
  scope key, permitted data sources, maximum read shape, foreground/visibility
  rule, and minimum interval or explicit exemption.
- Add lightweight task/run read models for counters, active rows, and scoped
  dashboard/sidebar summaries.
- Keep full ACP and SkillRunner records available only for selected run,
  backend tab, detail, recovery, or explicit diagnostic flows.
- Constrain dashboard, workspace, sidebar, task popover, backend health, local
  runtime, host bridge, synthesis progress/handshake, and ACP workspace activity
  refresh paths so periodic ticks first perform a cheap scope gate.
- Add diagnostics and tests proving scoped background refreshes do not read
  heavy run payloads.

## Capabilities

### New Capabilities

- `background-refresh-governance`: Defines scoped read rules, budgeted long-lived
  timers, and lightweight read models for background UI/runtime refresh.

### Modified Capabilities

- `skillrunner-sidebar-host-runtime`: Sidebar task attention and task lists must
  use lightweight scoped task summaries by default.
- `task-runtime-ui`: Dashboard and task popover refreshes must use scoped active
  summaries unless the user is viewing a scoped detail surface.
- `task-dashboard-history`: Dashboard history reads must be scoped to a visible
  backend/request/detail surface and must not be part of unscoped periodic
  refresh.

## Impact

- Affected runtime modules: dashboard/task manager, workspace tab/sidebar, task
  popover, task runtime/history, ACP skill run store, SkillRunner run store,
  backend reachability, managed local runtime, Host Bridge supervisor, synthesis
  workbench timers, and ACP workspace activity heartbeat.
- New internal read-model APIs and diagnostic hooks; no backend protocol changes.
- Tests shift from timing thresholds to asserting that background refresh paths
  do not perform heavy unscoped reads.
