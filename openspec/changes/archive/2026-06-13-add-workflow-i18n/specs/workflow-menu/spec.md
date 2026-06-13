## ADDED Requirements

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
