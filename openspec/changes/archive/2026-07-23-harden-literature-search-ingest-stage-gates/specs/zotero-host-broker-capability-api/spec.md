## MODIFIED Requirements

### Requirement: Literature ingest SHALL accept a typed bibliographic item payload

The canonical `literature.ingest` mutation SHALL accept an explicit Zotero item
type, item-type-compatible fields, structured creators, normalized identifiers,
and source URLs, and SHALL reject the legacy flat paper shape. It SHALL store a
normalized DOI in the native Zotero DOI field whenever that field is valid for
the selected item type, using `Extra` only when no native DOI field exists.

#### Scenario: Non-journal type preserves semantic fields

- **WHEN** a request ingests a thesis, book, book section, conference paper,
  report, or generic document
- **THEN** the Host creates that item type and maps only fields valid for that
  type.

#### Scenario: Unknown item type does not become journal article

- **WHEN** a traceable record has no confidently resolved bibliographic type
- **THEN** the caller uses `document` rather than the Host guessing
  `journalArticle`.

#### Scenario: Structured creator names are not heuristically split

- **WHEN** a creator is supplied as a single-field Chinese personal name or
  organization name
- **THEN** the Host stores the single-field name without splitting it on
  whitespace.

#### Scenario: Invalid field role is rejected

- **WHEN** a typed payload assigns a field that is invalid for its item type
- **THEN** the mutation returns a structured validation failure instead of
  silently redirecting the value to another field.

#### Scenario: Identifier-only DOI uses the native field

- **WHEN** a typed payload supplies `paper.identifiers.doi` for an item type
  whose Zotero schema supports DOI and omits `paper.fields.DOI`
- **THEN** the Host SHALL write the normalized identifier to the native DOI
  field
- **AND** it SHALL NOT append that DOI to `Extra`.

#### Scenario: Unsupported item type retains DOI in Extra

- **WHEN** a typed payload supplies a DOI for an item type without a native DOI
  field
- **THEN** the Host SHALL preserve one normalized `DOI: ...` line in `Extra`.

#### Scenario: DOI representations conflict

- **WHEN** normalized `paper.identifiers.doi` and `paper.fields.DOI` values are
  both present and differ
- **THEN** the mutation SHALL return a structured validation failure without
  creating or updating an item.
