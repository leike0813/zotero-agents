## Why

Assistant Workspace currently exists as separate live shell DOM trees in the
library pane and reader/context pane. That makes debugging, action routing, and
visible state convergence fragile because one hidden shell can retain stale
child iframes, drawer state, and cached snapshots that look similar to the
visible shell but are not the same instance.

## What Changes

- Converge Assistant Workspace to one live shell per Zotero main window.
- Keep library and reader/context integration points as lightweight dock
  containers only.
- Move the single Assistant shell frame between docks when the active Zotero
  target changes, preserving shell DOM and child panel DOM state.
- Route shell actions, child actions, snapshots, and SkillRunner host binding
  through the active target of the single shell.
- Bootstrap the single shell through an explicit lifecycle handshake so load,
  ready, and target commit can happen in any order without dropping the first
  init snapshot.
- Treat the main toolbar Assistant Sidebar button as a generic Assistant entry:
  it closes an open sidebar and opens ACP Chat when closed; explicit
  SkillRunner entry points still request the SkillRunner tab.
- Scope ACP Skills transcript rendering to the selected request so switching
  between concurrent runs cannot reuse the previous run's transcript DOM state.
- Add diagnostic DOM attributes so scripts can identify the single live shell
  and its active dock target.
- Do not change SkillRunner transcript scheduling; transcript timer behavior is
  handled by a separate change.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `assistant-sidebar-ui`: Define the single-live-shell Assistant Workspace
  contract across library and reader/context pane docks.
- `assistant-workspace-ui-refresh-governance`: Clarify that Assistant Workspace
  refreshes and actions target the single active shell and active target.

## Impact

- Affects Assistant Workspace sidebar host mounting, shell frame lifecycle,
  shell bridge installation, action routing, snapshot posting, and SkillRunner
  sidebar host attachment.
- Affects the main toolbar Assistant Sidebar entry point and ACP Skills
  selected-run snapshot/rendering behavior.
- Affects Assistant Workspace smoke/contract tests that previously tolerated or
  locked in two live shell instances.
- Does not change backend APIs, child panel page URLs, transcript rendering
  semantics, or the three tab pages loaded inside the Assistant shell.
