## ADDED Requirements

### Requirement: Host Bridge library reads share opaque keyset pagination

Host Bridge SHALL route `library.list_items`, `library.sync_snapshot`, `library.readiness_audit`, and `library.search_items` through the shared Zotero library page-query contract.

#### Scenario: Host Bridge returns a library page

- **WHEN** a client calls a paginated library capability
- **THEN** the result SHALL preserve the capability's bounded DTO shape and current-condition total count
- **AND** any `nextCursor` SHALL be an opaque string bound to the normalized criteria.

#### Scenario: Host Bridge receives an invalid cursor

- **WHEN** a library capability receives a malformed, unsupported, criteria-mismatched, or non-zero numeric cursor
- **THEN** Host Bridge SHALL return structured code `invalid_library_cursor`
- **AND** the error SHALL be non-retryable without corrected input.
