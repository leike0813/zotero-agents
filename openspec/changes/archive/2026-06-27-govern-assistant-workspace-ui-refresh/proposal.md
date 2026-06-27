## Why

Assistant Workspace panels can still re-render at high frequency during live
agent runs because multiple snapshot sources bypass text-chunk throttling. This
causes visible Zotero UI stalls on slower machines and makes the existing
streaming render preference ineffective when metadata or task updates publish
snapshots between text chunks.

## What Changes

- Govern ACP Chat, ACP Skills, and SkillRunner through one Assistant Workspace
  UI publish model.
- Keep canonical run state and persistence real-time while publishing a separate
  UI-visible transcript view.
- Preserve streaming render by default, but limit live UI publishing to a shared
  cadence.
- Make disabled streaming render mean boundary-only transcript publishing.
- Show the same global streaming render switch in ACP Chat, ACP Skills, and
  SkillRunner, synchronized with Preferences.
- Update localized preference and toolbar wording to describe Assistant
  Workspace scope.

## Capabilities

### New Capabilities

- `assistant-workspace-ui-refresh-governance`: Defines the shared UI publish
  model and transcript visibility boundary for Assistant Workspace panels.

### Modified Capabilities

- `acp-chat-performance-ui`: Replaces text-chunk-only suppression with governed
  ACP UI publishing and UI-visible transcript snapshots.
- `assistant-sidebar-ui`: Extends the global streaming render switch to
  SkillRunner and requires transcript render revision gating.
- `skillrunner-sidebar-host-runtime`: Applies the same live/boundary refresh
  policy to SkillRunner sidebar snapshots.

## Impact

- Affects Assistant Workspace host snapshot posting, ACP Chat session snapshot
  publishing, ACP Skills run store publishing, SkillRunner sidebar workspace
  snapshots, shared panel projection, child panel rendering, preferences, and
  localization.
- Does not change ACP transport, SkillRunner backend protocol, workflow
  contracts, output validation, or persisted canonical transcript schemas.
