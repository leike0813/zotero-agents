# workbench-embedded-payload-storage Specification

## Purpose
TBD - created by archiving change stabilize-workbench-embedded-payload-attachments. Update Purpose after archive.
## Requirements
### Requirement: Workbench Payloads SHALL Use Anchored Embedded PNG Payload Storage
New Workbench note payload writes SHALL store machine-readable payloads in a note-child embedded image attachment containing a valid PNG payload chunk and SHALL keep that attachment referenced by note HTML.

#### Scenario: New payload is written
- **WHEN** a Workbench workflow writes a payload-backed note
- **THEN** the payload attachment SHALL contain a parseable v2 PNG payload chunk
- **AND** the note HTML SHALL include an `<img data-attachment-key>` anchor with the matching `data-zs-payload-anchor`.

#### Scenario: Payload is replaced
- **WHEN** a payload type is written again for the same note
- **THEN** the old payload attachment and old payload anchor for that payload type SHALL be removed
- **AND** unrelated representative images or other payload anchors SHALL be preserved.

### Requirement: Workbench Payload Readers SHALL Preserve Legacy Read Compatibility
Payload readers SHALL read v2 PNG chunk payloads, v1 tail-marker embedded payloads, and hidden HTML payload blocks.

#### Scenario: Legacy payloads are listed
- **WHEN** a note contains a v1 tail-marker payload or hidden HTML payload block
- **THEN** payload listing SHALL return the payload with storage/source diagnostics
- **AND** it SHALL NOT rewrite the note unless an explicit migration workflow runs.

### Requirement: Debug Migration SHALL Upgrade Recoverable Payload Notes To V2
The debug migration workflow SHALL migrate recoverable legacy payload notes to v2 anchored embedded payload storage.

#### Scenario: Hidden or v1 embedded payload is migrated
- **WHEN** migration processes a note with a recoverable hidden payload block or v1 embedded payload attachment
- **THEN** it SHALL write a v2 payload attachment and matching anchor
- **AND** it SHALL remove hidden payload blocks from the visible note HTML.

#### Scenario: V2 payload lacks anchor
- **WHEN** migration processes a note with a v2 payload attachment but no matching anchor
- **THEN** it SHALL repair the anchor without changing the payload content.

