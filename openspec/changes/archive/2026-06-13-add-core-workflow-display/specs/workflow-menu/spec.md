## ADDED Requirements

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
