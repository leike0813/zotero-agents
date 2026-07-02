## 1. Contracts

- [x] 1.1 Update Assistant sidebar host tests to require a single movable shell
  frame and dock-only library/reader containers.
- [x] 1.2 Update Assistant Workspace smoke tests to require diagnostic shell and
  dock attributes plus active target init payload.

## 2. Runtime

- [x] 2.1 Refactor Assistant Workspace host state so library and reader are
  docks and the live shell frame is stored once on the host runtime.
- [x] 2.2 Implement single-shell docking, bridge installation, snapshot posting,
  action routing, and SkillRunner host binding against the active target.

## 3. Verification

- [x] 3.1 Validate the OpenSpec change and run the focused Assistant Workspace
  contract tests.
- [x] 3.2 Run the project build check and mark all completed tasks.

## 4. Audit Hardening

- [x] 4.1 Remove the dead `dockedTarget` host field and the tests that kept it
  alive only as a source string.
- [x] 4.2 Reject fallback shell messages unless their source is the single
  shell frame window.
- [x] 4.3 Commit `host.activeTarget` only after the single shell has docked
  successfully.
- [x] 4.4 Record the required Linux/Zotero 7+9 manual reparent verification
  for library <-> reader switches, cross-target tab switches, SkillRunner
  binding refresh, and single-shell diagnostics.

## 5. Field Bug Fixes

- [x] 5.1 Add explicit single-shell load/ready/pending-sync lifecycle state and
  flush initial init/snapshot only after lifecycle convergence.
- [x] 5.2 Change the main toolbar Assistant Sidebar button to a generic toggle
  that opens ACP Chat by default and closes without switching tabs.
- [x] 5.3 Keep explicit SkillRunner entry points on the SkillRunner tab.
- [x] 5.4 Reset ACP Skills transcript render state on selected request changes
  and prevent pending selection from rendering the previous run transcript.
- [x] 5.5 Make ACP Skills panel snapshot reads side-effect free for global
  selected request state.
- [x] 5.6 Publish ACP Chat and ACP Skills baseline init snapshots during shell
  lifecycle flush so first open does not leave child panels on static HTML.
- [x] 5.7 Re-announce initialized child-frame ready events after host init to
  recover child ready messages that arrived before active target commit.
- [x] 5.8 Preserve ACP Skills transcript page/render state per request id and
  restore or re-request it when switching concurrent runs.
