## MODIFIED Requirements

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
