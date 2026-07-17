## ADDED Requirements

### Requirement: Literature ingest SHALL accept a typed bibliographic item payload
The canonical `literature.ingest` mutation SHALL accept an explicit Zotero item type, item-type-compatible fields, structured creators, normalized identifiers, and source URLs, and SHALL reject the legacy flat paper shape.

#### Scenario: Non-journal type preserves semantic fields
- **WHEN** a request ingests a thesis, book, book section, conference paper, report, or generic document
- **THEN** the Host creates that item type and maps only fields valid for that type

#### Scenario: Unknown item type does not become journal article
- **WHEN** a traceable record has no confidently resolved bibliographic type
- **THEN** the caller uses `document` rather than the Host guessing `journalArticle`

#### Scenario: Structured creator names are not heuristically split
- **WHEN** a creator is supplied as a single-field Chinese personal name or organization name
- **THEN** the Host stores the single-field name without splitting it on whitespace

#### Scenario: Invalid field role is rejected
- **WHEN** a typed payload assigns a field that is invalid for its item type
- **THEN** the mutation returns a structured validation failure instead of silently redirecting the value to another field
