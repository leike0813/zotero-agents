## MODIFIED Requirements

### Requirement: Library predicates preserve Zotero item semantics
The system SHALL return only non-deleted, top-level regular items and SHALL consistently apply optional library, collection, tag, item type, and literal string `filter` criteria.

#### Scenario: Structural filters are applied
- **WHEN** a caller supplies library, collection, tag, or item type criteria
- **THEN** only matching non-deleted top-level regular items SHALL be eligible for the page and total count.

#### Scenario: Text criteria are applied
- **WHEN** a caller supplies a non-empty `filter`
- **THEN** an item SHALL match when title, creator, date, publication, abstract, tag, or item key contains the text under Zotero SQLite `NOCASE` semantics
- **AND** each field SHALL be matched independently.

#### Scenario: LIKE metacharacters are literal
- **WHEN** a filter contains `%` or `_`
- **THEN** those characters SHALL match literal characters rather than SQLite wildcard patterns.

#### Scenario: Empty text filter is omitted
- **WHEN** filter is omitted, empty or whitespace-only
- **THEN** no text predicate SHALL be applied to the count or page query.

### Requirement: Library cursors are opaque criteria-bound keysets
The system SHALL return versioned opaque string cursors that bind normalized library, collection, tag, item type and `filter` criteria to the last returned item ID.

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
