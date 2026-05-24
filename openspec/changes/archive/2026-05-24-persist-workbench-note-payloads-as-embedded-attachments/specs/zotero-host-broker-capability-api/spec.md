# zotero-host-broker-capability-api Delta

## ADDED Requirements

### Requirement: Host note payload APIs SHALL expose workflow payloads

Host Bridge note payload APIs MUST return workflow payloads regardless of whether they are stored in legacy HTML blocks or embedded payload attachments.

#### Scenario: Listing attachment-backed payloads
- **WHEN** `library.listNotePayloads` is called for a note with a valid workbench payload attachment
- **THEN** the response SHALL include the attachment-backed payload type, format, estimated size, and source metadata.

#### Scenario: Reading attachment-backed payload details
- **WHEN** `library.getNotePayload` is called for a payload type stored in a workbench payload attachment
- **THEN** the response SHALL return the same payload, markdown/content chunking, and JSON formatting semantics as legacy HTML payloads.

#### Scenario: Legacy payloads keep priority
- **WHEN** a note contains both a valid legacy HTML payload block and an attachment-backed payload of the same type
- **THEN** readers SHALL prefer the legacy HTML block for backward-compatible deterministic behavior.
