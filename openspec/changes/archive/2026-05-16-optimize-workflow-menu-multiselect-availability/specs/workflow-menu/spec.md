## ADDED Requirements

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
