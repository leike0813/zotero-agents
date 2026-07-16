## Why

The v5 Assistant Workspace publication refactor removed legacy snapshot state,
but its exact projector and shared child regressed established ACP Chat and ACP
Skills behavior. Usage, recovery, and workspace metadata are rendered as LED
indicators; drawer targets are replaced with the current owner; Skills task
state bypasses the workflow-task SSOT; localization and empty-state layout are
broken; and formal Replay still records render rejections and rebase storms.

## What Changes

- Replace the ambiguous v5 owner presentation payload with a strict v6 semantic
  presentation contract.
- Introduce one action-routing registry for local, target-owner,
  selected-owner, navigation-group, and global actions.
- Restore early Assistant panel UI semantics through the shared child and exact
  projector without restoring source-specific snapshot state machines.
- Derive Skills drawer state from the workflow-task projection SSOT and keep
  run, backend, apply, recovery, and connection axes independent.
- Make transcript delta rendering transactional and preserve bounded renderer
  failure diagnostics through profiler and Replay lifecycle records.
- Add per-run publication epochs so stale work from another surface cannot
  contaminate formal Replay measurement.

## Capabilities

### Modified Capabilities

- `assistant-workspace-publication-data-plane`
- `assistant-workspace-ui-refresh-governance`
- `assistant-sidebar-ui`
- `acp-chat-performance-ui`
- `acp-skill-run-file-backed-runtime-state`
- `acp-runtime-performance-profiler`
- `acp-runtime-replay-profiler`
- `plugin-localization-governance`

## Impact

This change affects the Assistant Workspace publication types, Chat and Skills
read models, shared child/model/renderer/CSS, Sidebar action handling,
transcript renderer, profiler and Replay sidecar, localization, tests, and
current-state documentation. It does not change transcript persistence,
conversation/run stores, external APIs, dependencies, or user settings.
