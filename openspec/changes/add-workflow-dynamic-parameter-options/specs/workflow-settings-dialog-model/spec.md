## ADDED Requirements

### Requirement: Workflow settings descriptors expose dynamic options

The workflow settings descriptor SHALL resolve supported parameter option
sources before rendering.

#### Scenario: Collection options resolve

- **WHEN** a workflow parameter declares `zotero.collections`
- **THEN** the descriptor entry SHALL include option DTOs
- **AND** the UI SHALL display option labels while storing submitted values.

#### Scenario: Collection options fail to resolve

- **WHEN** the host cannot resolve a dynamic option source
- **THEN** the descriptor SHALL remain renderable
- **AND** the parameter SHALL fall back to text input behavior.
