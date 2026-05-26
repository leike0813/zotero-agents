## MODIFIED Requirements

### Requirement: Browser UI surfaces SHALL share one visual theme foundation

First-party browser UI surfaces SHALL load a shared browser theme foundation,
including Dashboard, Assistant sidebar panels, Synthesis Workbench, and the
unified Workspace.

#### Scenario: Shared theme assets are loaded

- **WHEN** any first-party browser UI surface is opened
- **THEN** it SHALL load the shared theme stylesheet
- **AND** it SHALL use the shared theme runtime before page-specific rendering.

#### Scenario: Plugin brand icons use the current Zotero Agents assets

- **WHEN** the plugin loads favicon or full-logo assets
- **THEN** the bundled assets SHALL use the current Zotero Agents icon set.

## ADDED Requirements

### Requirement: Toolbar and workflow entrypoint icons SHALL match their action roles

The plugin SHALL use distinct icons for workflow execution, workspace opening,
and sidebar opening entrypoints.

#### Scenario: Workflow execution entrypoints use the play icon

- **WHEN** a workflow execution toolbar or shortcut menu entrypoint is rendered
- **THEN** it SHALL use the bundled `icon_play.png` asset.

#### Scenario: Workspace and sidebar entrypoints use dedicated icons

- **WHEN** the unified workspace toolbar entrypoint is rendered
- **THEN** it SHALL use `icon_workbench.png`.
- **WHEN** the assistant/sidebar toolbar entrypoint is rendered
- **THEN** it SHALL use `icon_sidebar.png`.
