# assistant-sidebar-ui

## MODIFIED Requirements

### Requirement: Unified assistant sidebar shell

The plugin SHALL provide one Zotero side-pane Assistant entry that can switch
between SkillRunner, ACP Chat, and ACP Skills views. The shell and child panels
SHALL load the shared Zotero Skills visual theme foundation.

#### Scenario: Tab shell opens existing views

Given the Assistant sidebar is opened
When the user selects a tab
Then the shell SHALL show the corresponding existing page without requiring a
separate Zotero side-pane button.

#### Scenario: Assistant shell follows selected theme

- **WHEN** the selected visual theme is dark
- **THEN** the Assistant shell, tab bar, child frames, drawers, transcript
  surfaces, and reply controls SHALL render using dark-compatible tokens.

