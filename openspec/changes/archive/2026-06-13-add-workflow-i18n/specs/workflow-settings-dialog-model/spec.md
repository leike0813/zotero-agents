## ADDED Requirements

### Requirement: Workflow settings descriptors SHALL expose localized workflow display copy

Workflow settings descriptors SHALL use the active display locale for workflow-owned fixed UI strings while preserving raw workflow ids and parameter keys.

#### Scenario: Parameter titles are localized

- **WHEN** a workflow parameter has a localized title or description for the active locale
- **THEN** the workflow settings descriptor entry SHALL expose the localized title or description
- **AND** submitted settings SHALL continue using the original parameter key.

#### Scenario: Missing parameter localization falls back

- **WHEN** a workflow parameter has no matching localized title or description
- **THEN** the descriptor SHALL fall back to the raw manifest title or description.
