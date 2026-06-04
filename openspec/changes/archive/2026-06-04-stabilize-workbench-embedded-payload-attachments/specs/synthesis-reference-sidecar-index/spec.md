## ADDED Requirements

### Requirement: Reference Sidecar Index SHALL read artifact availability from Zotero Library plus sidecar cache
Artifact availability SHALL be based on parseable embedded payload attachments, not note-only or hidden-block fallback.

#### Scenario: Note exists without embedded payload
- **WHEN** a digest, references, or citation-analysis note exists but no parseable embedded payload attachment exists
- **THEN** the corresponding artifact SHALL be treated as `missing`.

#### Scenario: Embedded payload is malformed
- **WHEN** an embedded payload attachment or anchor exists but the payload cannot be parsed
- **THEN** the corresponding artifact SHALL be treated as `error`
- **AND** hidden HTML payload blocks SHALL NOT make it available.
