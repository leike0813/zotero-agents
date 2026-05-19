## Why

High-frequency UI snapshots in Dashboard, ACP Skills, ACP Chat, Synthesis, and
workflow settings can rebuild active DOM regions while the user is typing,
choosing, or scrolling. This has already produced repeated focus-loss and
disabled-composer regressions, so the project needs explicit refresh boundaries
rather than more one-off focus restoration patches.

## What Changes

- Add a UI refresh-boundary audit for recurring snapshot renderers that use
  destructive DOM replacement around active controls.
- Stabilize shared assistant reply and drawer regions so unrelated snapshot
  updates do not replace focused inputs or interactive controls.
- Preserve ACP Skills per-run composer state when other runs stream or refresh.
- Preserve Synthesis Workbench search/filter/scroll state and workflow settings
  form state during host-driven refreshes.
- Require behavior-baseline tests before changing UI paths that affect buttons,
  disabled state, selection, inputs, drawers, lists, or scroll behavior.

## Capabilities

### New Capabilities

### Modified Capabilities

- `assistant-sidebar-ui`: shared assistant reply and drawer regions preserve
  active DOM state under unrelated live updates without changing composer,
  choice, permission, interrupt, or drawer semantics.
- `acp-skillrunner-compatible-runner`: ACP Skills selected-run composer state
  is isolated from other run updates and terminal/waiting/running reply
  semantics remain stable.
- `synthesis-tab-ui`: Synthesis Workbench search, filter, and scroll state
  survive snapshot refreshes while existing workbench actions keep their
  semantics.
- `workflow-settings-dialog-model-split`: workflow settings forms preserve
  active field state during option/status refreshes while save, apply, cancel,
  validation, and custom select behavior remain unchanged.

## Impact

- Affected frontend code includes the shared assistant panel renderer, ACP
  Skills runtime page, Synthesis Workbench frontend, workflow settings dialog,
  and Dashboard refresh paths.
- Affected tests include ACP UI smoke coverage plus focused DOM stability tests
  for Synthesis and workflow settings surfaces.
- No backend protocol, ACP protocol, SkillRunner workflow contract, MCP
  transport, or dependency changes are introduced.
