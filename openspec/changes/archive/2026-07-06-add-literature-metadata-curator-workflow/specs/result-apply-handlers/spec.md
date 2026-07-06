## ADDED Requirements

### Requirement: Parent metadata handler SHALL update fields and creators together

The result apply handlers SHALL expose a parent metadata update operation for workflow-owned bibliographic correction.

#### Scenario: Fields and creators are saved in one handler call

- **WHEN** a workflow calls `handlers.parent.updateMetadata()` with scalar fields and creators
- **THEN** the handler SHALL apply valid fields to the parent item
- **AND** it SHALL replace creators when a non-empty creators array is provided
- **AND** it SHALL save the parent item once for the combined metadata update.

#### Scenario: Invalid fields do not block valid metadata

- **WHEN** a metadata update includes a field that is invalid for the current parent item type
- **THEN** the handler SHALL skip that invalid field
- **AND** it SHALL still apply valid fields and creators.
