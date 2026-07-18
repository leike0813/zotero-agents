## ADDED Requirements

### Requirement: Library pages are selected in the Zotero database

The system SHALL apply normalized library, collection, tag, item type, and text predicates in parameterized Zotero SQLite queries and SHALL hydrate only IDs selected for the returned page.

#### Scenario: A bounded page is read

- **WHEN** a caller requests a library page with limit `L`
- **THEN** the page query SHALL select at most `L + 1` ordered item IDs using `itemID > afterItemId`
- **AND** the service SHALL hydrate at most the `L` IDs returned to the caller
- **AND** the production path MUST NOT call `Zotero.Items.getAll()`.

#### Scenario: Total matches are counted

- **WHEN** a paginated response reports the current condition's total match count
- **THEN** the count query SHALL reuse the page query's filtering predicate without the keyset-position predicate.

### Requirement: Library predicates preserve Zotero item semantics

The system SHALL return only non-deleted, top-level regular items and SHALL consistently apply optional library, collection, tag, item type, and text criteria.

#### Scenario: Structural filters are applied

- **WHEN** a caller supplies library, collection, tag, or item type criteria
- **THEN** only matching non-deleted top-level regular items SHALL be eligible for the page and total count.

#### Scenario: Text criteria are applied

- **WHEN** a caller supplies text criteria
- **THEN** an item SHALL match when title, creator, date, publication, abstract, tag, or item key contains the text under Zotero SQLite `NOCASE` semantics
- **AND** each field SHALL be matched independently.

#### Scenario: LIKE metacharacters are literal

- **WHEN** text criteria contain `%` or `_`
- **THEN** those characters SHALL match literal characters rather than SQLite wildcard patterns.

### Requirement: Library cursors are opaque criteria-bound keysets

The system SHALL return versioned opaque string cursors that bind the normalized query criteria to the last returned item ID.

#### Scenario: First page is requested

- **WHEN** a caller omits `cursor` or supplies string `"0"`
- **THEN** the service SHALL query from the beginning of the matching item-ID order.

#### Scenario: Later page is requested

- **WHEN** a caller passes the exact `nextCursor` returned for the same normalized criteria
- **THEN** the service SHALL continue strictly after the cursor's item ID
- **AND** already returned IDs SHALL NOT be returned again.

#### Scenario: Library changes between pages

- **WHEN** matching rows are inserted or deleted between page requests
- **THEN** the next page SHALL continue strictly after the cursor item ID without offset shifting or duplication.

### Requirement: Invalid library cursors fail structurally

The system SHALL reject malformed, unsupported, criteria-mismatched, and legacy non-zero numeric library cursors with code `invalid_library_cursor`.

#### Scenario: Cursor cannot be reused

- **WHEN** a cursor is damaged, has an unsupported version, or is used with different normalized criteria
- **THEN** the request SHALL fail with `invalid_library_cursor`
- **AND** the service MUST NOT restart at the first page.

#### Scenario: Numeric offset is supplied

- **WHEN** a caller supplies a non-zero numeric cursor or its legacy offset representation
- **THEN** the request SHALL fail with `invalid_library_cursor`.
