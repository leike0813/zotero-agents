# Spec Delta

## ADDED Requirements

### Requirement: Snapshot annotation counts SHALL respect native attachment eligibility

Snapshot annotation counts SHALL include only file attachments accepted by Zotero's annotation API. Linked-URL attachments SHALL remain in attachment counts and contribute zero annotations. A failed annotation read on an eligible file attachment SHALL fail the snapshot without completion evidence.

#### Scenario: Parent contains linked and file attachments

- **WHEN** a parent has both linked-URL and file attachments
- **THEN** the snapshot SHALL include the parent and count every attachment
- **AND** its annotation count SHALL include annotations on file attachments only
- **AND** a stable complete snapshot SHALL retain its normal completion evidence.

#### Scenario: File attachment annotation read fails

- **WHEN** an eligible file attachment's annotation read throws
- **THEN** the snapshot SHALL fail without completion evidence
- **AND** consumers SHALL retain their prior usable index.
