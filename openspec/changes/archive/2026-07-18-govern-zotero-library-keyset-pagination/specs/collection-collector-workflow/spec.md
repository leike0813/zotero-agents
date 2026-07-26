## ADDED Requirements

### Requirement: Collection collector passes through opaque library cursors

The collection collector SHALL start library inventory paging without a cursor and SHALL continue only with the exact opaque cursor returned by the previous page.

#### Scenario: Inventory pagination starts and continues

- **WHEN** the runtime requests the first library inventory page
- **THEN** it SHALL omit `cursor`
- **AND** when a page returns `nextCursor`, the next request SHALL pass that value through unchanged
- **AND** it MUST NOT initialize, parse, or increment a numeric offset cursor.
