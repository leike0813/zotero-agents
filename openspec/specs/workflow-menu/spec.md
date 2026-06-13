# workflow-menu Specification

## Purpose
TBD - created by archiving change optimize-workflow-menu-multiselect-availability. Update Purpose after archive.
## Requirements
### Requirement: Workflow menu multi-select availability MUST use lazy validation

The workflow action menu MUST avoid per-workflow request-building preflight when
it is opened with multiple selected Zotero items, and it SHALL defer
workflow-specific input filtering until the user triggers a workflow.

#### Scenario: Single selection keeps precise menu validation

- **WHEN** the workflow menu is opened with exactly one selected item
- **THEN** the system SHALL continue checking whether each workflow can build a
  request for that item
- **AND** workflows with invalid input SHALL be rendered disabled with a reason.

#### Scenario: Multiple selection skips request preflight

- **WHEN** the workflow menu is opened with more than one selected item
- **THEN** the system SHALL NOT call request-building preflight for each workflow
- **AND** visible workflows SHALL be rendered enabled unless rejected by global
  no-selection rules.

#### Scenario: Submit-time filtering still applies

- **WHEN** a user triggers a workflow from the menu after multi-select lazy
  rendering
- **THEN** normal workflow execution preparation SHALL still build requests,
  filter invalid input units, and report skips or no-valid-input outcomes.

### Requirement: Workflow Menu Avoids Heavy Dynamic Option Reads
The workflow menu SHALL build and preflight menu entries without resolving heavyweight dynamic workflow parameter options, including Synthesis topic options that require full Workbench snapshots.

#### Scenario: Opening workflow menu with Synthesis topic workflow
- **WHEN** the user opens the workflow toolbar menu and a visible workflow has `optionsSource.kind` equal to `synthesis.topics`
- **THEN** the menu MUST NOT call the full Synthesis Workbench snapshot path
- **AND** the menu MUST still render the workflow entry and ordinary disabled reason state.

#### Scenario: Triggering workflow still validates inputs
- **WHEN** the user executes a workflow from the menu
- **THEN** the normal workflow execution path MUST still resolve required execution context and validate workflow inputs before submitting the run.

### Requirement: Workflow menu SHALL exclude deprecated built-in reference note workflows

The workflow menu SHALL be built from active loaded workflow manifests only.

#### Scenario: Deprecated workflows are not menu actions

- **WHEN** the active built-in registry is used to render workflow actions
- **THEN** no menu action SHALL be rendered for built-in workflow id `reference-matching`
- **AND** no menu action SHALL be rendered for built-in workflow id `reference-note-editor`.

### Requirement: Workflow menu SHALL group core workflows above other workflows

The workflow action menu SHALL render core workflows before non-core workflows. If both groups are present, the menu SHALL insert a separator between them. Core workflow labels SHALL be visually emphasized.

#### Scenario: Core and non-core workflows are both visible

- **GIVEN** visible workflows include at least one core workflow and at least one non-core workflow
- **WHEN** the workflow action menu is rebuilt
- **THEN** core workflow menu items appear first
- **AND** a separator appears before the first non-core workflow
- **AND** core workflow labels are bold

#### Scenario: Only one workflow group is visible

- **GIVEN** visible workflows are all core or all non-core
- **WHEN** the workflow action menu is rebuilt
- **THEN** no core/non-core group separator is added

### Requirement: Workflow menu SHALL use localized workflow labels

The workflow action menu SHALL render workflow-owned display labels using the active display locale.

#### Scenario: Menu label is localized

- **WHEN** a visible workflow has a localized `label` for the active locale
- **THEN** the workflow menu item SHALL display that localized label
- **AND** command execution SHALL still target the stable workflow id.

#### Scenario: Disabled reason is appended to localized label

- **WHEN** a workflow menu entry is disabled
- **THEN** the disabled reason SHALL be appended to the localized label
- **AND** missing localization SHALL fall back to the raw manifest label.

