## MODIFIED Requirements

### Requirement: Unified assistant sidebar shell

The plugin SHALL provide one Zotero side-pane Assistant entry that can switch
between SkillRunner, ACP Chat, and ACP Skills views. The shell and child panels
SHALL load the shared Zotero Skills visual theme foundation.

The unified Assistant Workspace SHALL be the only active sidebar host for these
views. Legacy standalone sidebar host modules SHALL NOT be imported by active
source code.

The Assistant Workspace static entry SHALL be packaged at
`content/sidebar/assistant-workspace.html`. Its sidebar-owned child panel pages
SHALL be packaged under `content/sidebar`. Shared Assistant panel renderer,
model, transcript, conversation, and common panel CSS assets SHALL be packaged
under `content/shared/assistant`. Shared markdown, math, and highlight vendor
assets SHALL be packaged under `content/shared/vendor`.

#### Scenario: Tab shell opens existing views

Given the Assistant sidebar is opened
When the user selects a tab
Then the shell SHALL show the corresponding existing page without requiring a
separate Zotero side-pane button.

#### Scenario: Assistant shell follows selected theme

- **WHEN** the selected visual theme is dark
- **THEN** the Assistant shell, tab bar, child frames, drawers, transcript
  surfaces, and reply controls SHALL render using dark-compatible tokens.

#### Scenario: Legacy action names route to the unified workspace

- **WHEN** an existing caller emits `openSkillRunnerSidebar`, `openAcpSidebar`,
  or `openAcpSkillRunnerSidebar`
- **THEN** the plugin SHALL open the unified Assistant Workspace
- **AND** it SHALL select the matching `skillrunner`, `acp-chat`, or
  `acp-skills` tab.

#### Scenario: Current child pages remain workspace-owned

- **WHEN** the unified Assistant Workspace loads
- **THEN** it SHALL continue to load `acp-chat.html`, `acp-skill-run.html`, and
  `run-dialog.html` as child panels from the sidebar content directory.

#### Scenario: Shared resources are not dashboard-owned

- **WHEN** Assistant sidebar panels, dashboard markdown previews, Markdown
  Reader, or Synthesis load markdown/math/highlight libraries
- **THEN** those pages SHALL reference `content/shared/vendor` rather than
  `content/dashboard/vendor`.
- **AND** Assistant sidebar panels SHALL reference shared Assistant panel assets
  from `content/shared/assistant` rather than `content/dashboard`.
