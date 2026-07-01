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

#### Scenario: Legacy and batch literature ingest inputs are rejected

- **WHEN** a mutation request uses `operation: "paper.ingest"` or passes a
  `papers` batch payload to `operation: "literature.ingest"`
- **THEN** the system SHALL reject the mutation with a structured JSON-safe error
- **AND** Zotero data SHALL NOT be changed.

#### Scenario: Unsupported or invalid mutation

- **WHEN** a mutation has an unsupported operation, invalid reference, invalid
  field, empty payload, or oversized input
- **THEN** the system SHALL reject it with a structured JSON-safe error
- **AND** Zotero data SHALL NOT be changed.

## ADDED Requirements

### Requirement: Literature ingest may attach landing URL when PDF is missing

`literature.ingest` SHALL support an optional `paper.attachLandingUrlOnMissingPdf`
boolean. The default SHALL be false.

#### Scenario: Missing PDF creates landing URL attachment when requested

- **WHEN** `literature.ingest` successfully creates or reuses a literature item
- **AND** `paper.attachLandingUrlOnMissingPdf` is true
- **AND** the resulting item has no PDF attachment after PDF import handling
- **AND** `paper.landingUrl` is a non-empty HTTP(S) URL
- **THEN** the mutation SHALL create or reuse one linked URL child attachment
  for that landing URL
- **AND** the ingest result SHALL include `landingAttachmentStatus`.

#### Scenario: Existing PDF suppresses landing URL attachment

- **WHEN** `literature.ingest` successfully creates or reuses a literature item
- **AND** the resulting item has a PDF attachment
- **THEN** the mutation SHALL NOT create a landing URL attachment for missing-PDF recovery.

#### Scenario: Landing URL attachment failure is non-fatal

- **WHEN** landing URL attachment creation fails
- **THEN** the literature item ingest SHALL remain successful
- **AND** the result SHALL include `landingAttachmentStatus: "failed"` and a
  structured `landingAttachmentError`.
