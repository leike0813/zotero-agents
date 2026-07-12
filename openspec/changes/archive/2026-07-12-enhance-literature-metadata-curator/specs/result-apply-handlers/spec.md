## MODIFIED Requirements

### Requirement: Parent metadata handler SHALL update fields and creators together

The result apply handlers SHALL expose a parent metadata update operation for
workflow-owned bibliographic correction, including an optional regular Zotero
item-type correction.

#### Scenario: Type, fields, and creators are saved in one handler call

- **WHEN** a workflow calls `handlers.parent.updateMetadata()` with a valid regular item type, scalar fields, and creators
- **THEN** the handler SHALL change the parent item type before validating fields
- **AND** it SHALL apply valid fields for the target type
- **AND** it SHALL replace creators when a non-empty creators array is provided
- **AND** it SHALL save the parent item once for the combined metadata update.

#### Scenario: Invalid type or field does not block valid metadata

- **WHEN** a metadata update includes an unknown item type, `attachment`, `note`, `annotation`, or a field invalid for the applicable parent item type
- **THEN** the handler SHALL skip the invalid type or field
- **AND** it SHALL still apply valid fields and creators.
