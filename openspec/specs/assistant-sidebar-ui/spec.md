# assistant-sidebar-ui Specification

## Purpose
TBD - created by archiving change unify-assistant-sidebar-and-acp-skill-interaction-ui. Update Purpose after archive.
## Requirements
### Requirement: Unified assistant sidebar shell

The plugin SHALL provide one Zotero side-pane Assistant entry that can switch between SkillRunner, ACP Chat, and ACP Skills views.

#### Scenario: Tab shell opens existing views

Given the Assistant sidebar is opened
When the user selects a tab
Then the shell SHALL show the corresponding existing page without requiring a separate Zotero side-pane button.

### Requirement: ACP visual alignment

ACP Chat and ACP Skills SHALL share the same core visual semantics for running state, tool status LEDs, and plan status icons.

#### Scenario: ACP Skills plan follows ACP Chat behavior

Given an ACP skill run has a non-terminal plan
When the ACP Skills panel renders
Then it SHALL show the plan in a dedicated plan panel with status icons
And it SHALL hide the plan panel when all entries are terminal.

### Requirement: ACP Skills reply scaffold

ACP Skills SHALL provide a reply composer scaffold for future interactive runs.

#### Scenario: Auto run reply is disabled

Given the selected ACP skill run does not expose interactive waiting state
When the ACP Skills panel renders
Then the reply composer SHALL be visible but disabled with an explanatory hint.

