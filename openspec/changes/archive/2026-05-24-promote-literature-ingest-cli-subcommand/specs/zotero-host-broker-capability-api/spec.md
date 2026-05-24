## MODIFIED Requirements

### Requirement: Controlled mutation command API

The system SHALL expose limited Zotero write operations through
`hostApi.mutations.preview()` and `hostApi.mutations.execute()`.

#### Scenario: Preview validates without writing

- **WHEN** a supported mutation request is passed to `preview()`
- **THEN** the system SHALL validate references and inputs, produce a summary,
  and mark `requiresConfirmation` as true
- **AND** Zotero data SHALL NOT be changed.

#### Scenario: Execute delegates to handlers

- **WHEN** a supported mutation request is passed to `execute()` after
  caller-side permission confirmation
- **THEN** the system SHALL reuse existing handler primitives for the write
- **AND** the result SHALL return JSON-safe changed-object summaries.

#### Scenario: Literature ingest uses canonical operation

- **WHEN** a literature ingest mutation is passed to `preview()` or `execute()`
- **THEN** the canonical operation SHALL be `literature.ingest`
- **AND** successful preview and execute responses SHALL report
  `operation: "literature.ingest"`.

#### Scenario: Legacy paper ingest alias is accepted

- **WHEN** a legacy mutation request uses `operation: "paper.ingest"`
- **THEN** the mutation SHALL remain accepted for compatibility
- **AND** the response SHALL normalize the operation to `literature.ingest`.

#### Scenario: Unsupported or invalid mutation

- **WHEN** a mutation has an unsupported operation, invalid reference, invalid
  field, empty payload, or oversized input
- **THEN** the system SHALL reject it with a structured JSON-safe error
- **AND** Zotero data SHALL NOT be changed.
