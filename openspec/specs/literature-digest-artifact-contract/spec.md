# literature-digest-artifact-contract Specification

## Purpose
Define the external import/export artifact contract for literature-digest generated notes.
## Requirements
### Requirement: Literature-Digest Generated Notes SHALL Support Canonical Artifact Export Mapping
The three generated note kinds from literature-digest MUST map deterministically to external artifact files.

#### Scenario: References note exports decoded JSON payload
- **WHEN** a references generated note is exported
- **THEN** the workflow SHALL base64-decode the hidden payload block
- **AND** it SHALL export the decoded JSON as native `references.json`
- **AND** the default external shape SHALL be a bare JSON array
- **AND** it SHALL NOT export the plugin-internal wrapper payload shape

#### Scenario: References note is written after deterministic quality filtering
- **WHEN** literature-digest apply writes a references generated note
- **THEN** deterministic invalid reference rows SHALL be removed before the note payload is stored
- **AND** warning-only low-quality rows SHALL remain in the stored references array
- **AND** quality counters or rejected-row diagnostics SHALL NOT be added as a top-level native references artifact wrapper.

### Requirement: Literature-Digest Artifact Import SHALL Reuse Canonical Generated-Note Writing
Artifact import flows MUST reuse the same canonical generated-note writer used by the original literature-digest workflow.

#### Scenario: Import digest markdown
- **WHEN** a valid digest markdown file is imported for a parent item
- **THEN** the system SHALL upsert the digest generated note using the shared literature-digest note writer

#### Scenario: Import references and citation-analysis JSON
- **WHEN** valid references or citation-analysis JSON artifacts are imported
- **THEN** the system SHALL normalize them into the canonical payload shape
- **AND** it SHALL write them through the shared literature-digest note writer rather than a duplicate implementation

#### Scenario: Import only accepts native artifacts
- **WHEN** a references or citation-analysis JSON file uses the old wrapper shape
- **THEN** the import flow SHALL reject it
- **AND** only native Skill-Runner artifact JSON SHALL be accepted as external file contract

#### Scenario: Native references import accepts both runtime-native and schema-native forms
- **WHEN** a references JSON file is either a bare array or an object with top-level `items`
- **THEN** the import flow SHALL accept both as native references artifacts
- **AND** it SHALL normalize both into the same internal references payload for note writing

### Requirement: Literature-Digest Artifact Validation SHALL Use Copied Workflow-Local Schemas
Structured JSON artifact import MUST validate against workflow-local copies of the literature-digest render schemas.

#### Scenario: References schema copy is used for validation
- **WHEN** references JSON is imported
- **THEN** validation SHALL use the workflow-local copy of `references.schema.json`
- **AND** runtime SHALL NOT depend on reading the external `reference/Skill-Runner` tree

#### Scenario: Citation analysis schema copy is used for validation
- **WHEN** citation-analysis JSON is imported
- **THEN** validation SHALL use the workflow-local copy of `citation_analysis.schema.json`
- **AND** runtime SHALL NOT depend on reading the external `reference/Skill-Runner` tree
- **AND** validation SHALL interpret the copied wrapper schema as the native inner citation-analysis artifact contract

