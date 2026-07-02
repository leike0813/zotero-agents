## Context

Assistant Workspace is currently mounted once in the library item pane and once
in the reader/context pane. Each mount loads `assistant-workspace.html`, and
each shell preloads the ACP Chat, ACP Skills, and SkillRunner child panel
iframes. Only one pane is visible, but the hidden pane still owns a complete
Assistant DOM tree with cached snapshots and child-frame state.

The desired product model is one Assistant panel. Zotero may still require two
pane integration points, but those integration points must be docks, not two
Assistant Workspace instances.

## Goals / Non-Goals

**Goals:**

- Maintain one live Assistant Workspace shell frame per Zotero main window.
- Move the single shell frame between library and reader/context docks.
- Preserve shell DOM and child panel DOM state across pane target switches.
- Keep snapshot, action, and SkillRunner host routing tied to the active target
  of the single shell.
- Add stable DOM diagnostics for dock target and shell active target.

**Non-Goals:**

- Do not change SkillRunner transcript scheduling.
- Do not remove the ACP Chat, ACP Skills, or SkillRunner child iframes inside
  the shell.
- Do not replace the unified Assistant shell tab model.

## Decisions

- Use movable single shell frame. Library and reader panes keep separate dock
  containers and buttons, but only one browser/iframe loads
  `assistant-workspace.html`. Moving the frame preserves in-page DOM state and
  avoids synchronizing two similar shells.
- Keep hidden dock containers as host placeholders. Closing the sidebar hides
  the active dock and restores Zotero native pane content; the single shell may
  remain in its last dock so reopening is fast and still single-instance.
- Treat `host.activeTarget` as the target source of truth. Shell messages are
  accepted only from the single shell frame window, then routed with the active
  target instead of deriving target from separate frame windows.
- Refresh SkillRunner binding after docking. Detaching and re-attaching the
  sidebar host updates host/frame bindings without destroying the shell or child
  iframe DOM.
- Mark docks and shell for diagnostics. Dock containers expose
  `data-zs-assistant-dock-target` and active state; the shell frame exposes
  `data-zs-assistant-shell` and `data-zs-assistant-active-target`.
- Bootstrap with an explicit shell lifecycle handshake. The host tracks shell
  load, shell ready, child ready, and pending initial sync independently, then
  flushes init plus ACP Chat/ACP Skills baseline snapshots only after an active
  target is committed and the shell is loaded or ready. Single-shell behavior
  cannot rely on a second frame reload or DOMContentLoaded event to
  self-correct missed first snapshots.
- Keep toolbar intent separate from SkillRunner intent. The main toolbar
  Assistant Sidebar button is a generic toggle that opens ACP Chat from closed
  state and closes from open state; task popovers, SkillRunner run actions, and
  compatibility entry points remain explicit SkillRunner routes.
- Scope ACP Skills transcript projection by request id. Snapshot reads do not
  mutate the globally selected request, pending selection does not keep
  rendering the old selected run, and request changes save/restore transcript
  page and render state before projecting the selected conversation.

Alternatives rejected:

- Synchronize two live shells. This leaves two DOM trees and keeps the original
  source of drift.
- Destroy inactive shell on target switch. This removes duplication but loses
  transient tab, drawer, focus, and child iframe DOM state.

## Risks / Trade-offs

- [Risk] Zotero/XUL browser nodes may behave unexpectedly when reparented.
  -> Mitigation: keep both docks in the same main window document, move with
  `appendChild`, and preserve the existing frame source and load handler.
  Node-based tests can validate host routing and DOM contracts, but they do
  not prove real Zotero 7/9 XUL `<browser>` reparent behavior. Before archive,
  verify on Linux with Zotero 7 and Zotero 9 by switching library <-> reader,
  switching tabs across targets, refreshing SkillRunner binding, and confirming
  diagnostics still show one live `assistant-workspace.html` shell.
- [Risk] Existing tests lock in two pane-created frames.
  -> Mitigation: update contract tests before implementation to assert the new
  single-shell invariant.
- [Risk] SkillRunner host state points at an old frame after docking.
  -> Mitigation: detach before target switch when needed and re-attach after
  the shell is docked and the active target is updated.
- [Risk] A failed dock operation could hide native Zotero content.
  -> Mitigation: abort activation, restore native pane content, keep the shell
  single-instance, and log a warning.
- [Risk] Shell load or shell ready can arrive before the active target is
  committed after the dock move.
  -> Mitigation: record load/ready as lifecycle state and flush init/snapshot
  through one pending-sync path after target commit. Re-announce initialized
  child frames after host init so child ready messages that arrived too early
  still trigger localized ACP child snapshots.
- [Risk] Multiple ACP Skills runs can update concurrently while selection is in
  flight.
  -> Mitigation: keep transcript page/render state keyed by request id, clear
  stale in-flight loading keys on request switch, and keep snapshot building
  read-only with respect to global selection.
