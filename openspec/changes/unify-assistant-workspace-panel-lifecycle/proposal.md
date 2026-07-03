## Why

Assistant Workspace now uses one live shell frame, but the three child panels
still do not share a reliable startup lifecycle. First open can leave ACP Chat
and ACP Skills on static HTML or fallback English UI because the first host
snapshot can arrive before child listeners are stable, and the shell only
replays cached payloads on later tab changes. Submitting an ACP Skill run fixes
the UI only because that path triggers `emitChanged()` and a fresh real
snapshot after the shell and children have stabilized.

## What Changes

- Replace the ineffective host/shell init acknowledgement with a host-driven
  state pulse that publishes current real snapshots at deterministic lifecycle
  points.
- Keep Assistant shell creation lazy until the user opens the sidebar. Loading
  the three child iframe tree during Zotero startup is too expensive and can
  turn repeated ready/snapshot handshakes into a UI-wide slowdown.
- Replay cached child payloads whenever a child reports ready, not only when
  the user switches tabs, but report each child ready edge to the host only
  once per child frame lifecycle.
- Route all shell posts, source checks, and SkillRunner sidebar binding through
  the current live shell window instead of a stale cached `contentWindow`.
- Make ACP Chat, ACP Skills, and SkillRunner use the same child ready,
  host snapshot, shell cache, and replay lifecycle. Snapshot publication is
  active-tab driven so hidden tabs do not trigger host refresh work.
- Remove SkillRunner attach-time implicit init and the double-prefix ready
  fallback; SkillRunner SHALL render from explicit host snapshots when the
  SkillRunner tab is active, not from ACP Chat's baseline state pulse.
- Preserve the generic Assistant Sidebar entry behavior: generic entry points
  open ACP Chat when closed and close when open; explicit SkillRunner entry
  points may still request the SkillRunner tab.
- Do not change ACP Skills transcript selection or transcript page rendering in
  this change.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `assistant-sidebar-ui`: Require a unified child-panel lifecycle across ACP
  Chat, ACP Skills, and SkillRunner so first open and tab switches do not show
  static or fallback UI as the steady state.
- `assistant-workspace-ui-refresh-governance`: Require current live shell
  window routing and deterministic state pulse snapshot publication.
- `skillrunner-sidebar-host-runtime`: Require SkillRunner sidebar rendering to
  use the same host snapshot and shell replay lifecycle as the ACP panels.

## Impact

- Affects Assistant Workspace host runtime, shell bridge installation,
  shell-to-child snapshot caching, tab switching, child ready handling, and
  SkillRunner sidebar host attachment/refresh.
- Affects focused Assistant Workspace host runtime and ACP UI smoke tests.
- Does not change backend APIs, child panel URLs, ACP Skills transcript
  semantics, or the single live shell invariant.
