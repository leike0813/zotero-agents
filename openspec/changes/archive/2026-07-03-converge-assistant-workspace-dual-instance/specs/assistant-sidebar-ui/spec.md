## ADDED Requirements

### Requirement: Assistant Workspace SHALL use one live shell across pane docks

Assistant Workspace SHALL maintain at most one live
`assistant-workspace.html` shell frame per Zotero main window. The library pane
and reader/context pane SHALL provide dock containers only. Activating the
Assistant Workspace for a different pane target SHALL move the single shell
frame to that target's dock instead of creating another shell frame.

Inactive dock containers SHALL NOT contain another live Assistant Workspace
shell, SHALL NOT load another set of Assistant child panel iframes, and SHALL
NOT maintain an independent tab, drawer, reply, transcript, or cached snapshot
DOM tree.

#### Scenario: Switching pane targets preserves one shell DOM

- **WHEN** the Assistant Workspace is opened in the library pane and then
  opened in the reader/context pane
- **THEN** the same Assistant Workspace shell frame is docked in the reader
  container
- **AND** the library dock contains no second `assistant-workspace.html` shell
  frame
- **AND** the existing shell tab, drawer, child iframe, and reply DOM state is
  preserved by the move.

#### Scenario: Closing sidebar leaves no duplicate hidden shell

- **WHEN** the user closes the Assistant Workspace from any pane target
- **THEN** the active dock is hidden and Zotero's native pane content is
  restored
- **AND** no hidden inactive dock contains a second live Assistant Workspace
  shell.

### Requirement: Assistant Workspace docks SHALL be diagnosable

Assistant Workspace dock containers and the single shell frame SHALL expose
diagnostic DOM attributes that identify dock target, active dock state, and the
active target of the shell.

#### Scenario: Diagnostics select the active shell

- **WHEN** a diagnostic script searches for Assistant Workspace frames
- **THEN** it can identify the one live shell frame by a stable shell marker
- **AND** it can read the shell's current active target without inspecting
  hidden pane geometry.

### Requirement: Assistant sidebar toolbar toggle SHALL be generic

The main toolbar Assistant Sidebar button SHALL represent the unified
Assistant panel, not the legacy SkillRunner-only sidebar. When the sidebar is
closed, the toolbar toggle SHALL open the Assistant Workspace on the default
ACP Chat tab. When the sidebar is already open, the toolbar toggle SHALL close
it without switching tabs. Entry points that are explicitly tied to a
SkillRunner task or run MAY still request the SkillRunner tab.

#### Scenario: Toolbar opens ACP Chat by default

- **WHEN** the user clicks the main toolbar Assistant Sidebar button while the
  Assistant Workspace is closed
- **THEN** the Assistant Workspace opens on the ACP Chat tab
- **AND** it does not switch to the SkillRunner tab unless the entry point is an
  explicit SkillRunner action.

#### Scenario: Toolbar close does not switch tabs

- **WHEN** the Assistant Workspace is open on any tab
- **AND** the user clicks the main toolbar Assistant Sidebar button
- **THEN** the Assistant Workspace closes
- **AND** the host does not first switch to another tab.
