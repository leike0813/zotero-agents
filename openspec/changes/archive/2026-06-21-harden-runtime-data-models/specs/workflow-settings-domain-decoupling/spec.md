## ADDED Requirements

### Requirement: Workflow settings persistence MUST use a versioned domain document

Workflow settings persistence MUST support a versioned document contract owned by the workflow settings domain.

#### Scenario: New settings writes use versioned document

- **WHEN** workflow settings are saved by the domain settings writer
- **THEN** the persisted `workflowSettingsJson` payload SHALL contain a schema version
- **AND** workflow-specific settings SHALL be stored under a workflow-id keyed document field.

#### Scenario: Existing unversioned settings remain readable

- **WHEN** `workflowSettingsJson` contains the existing unversioned workflow-id keyed record
- **THEN** the workflow settings domain SHALL parse it as valid settings
- **AND** execution settings resolution SHALL remain behavior-equivalent.

#### Scenario: Malformed settings fail closed

- **WHEN** `workflowSettingsJson` contains malformed JSON or a non-object payload
- **THEN** the workflow settings domain SHALL treat it as an empty settings record
- **AND** workflow execution SHALL not receive partially parsed settings.

### Requirement: Workflow settings normalization MUST have a single domain parser

Workflow settings normalization MUST route persisted, run-once, and hook-returned settings patches through shared domain parsing helpers rather than duplicate local parsers.

#### Scenario: NormalizeSettings hook returns a partial patch

- **WHEN** a workflow `normalizeSettings` hook returns a partial settings patch
- **THEN** the patch SHALL be interpreted by the shared workflow settings domain parser
- **AND** merge precedence between persisted settings and incoming override SHALL remain unchanged.

#### Scenario: Backend id remap updates versioned settings

- **WHEN** backend registry maintenance remaps or removes a backend id referenced by workflow settings
- **THEN** the remap operation SHALL support the versioned settings document
- **AND** the resulting persisted settings SHALL remain readable by the workflow settings domain.
