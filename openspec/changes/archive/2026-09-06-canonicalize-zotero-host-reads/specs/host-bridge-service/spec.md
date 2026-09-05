## MODIFIED Requirements

### Requirement: Host Bridge library reads share opaque keyset pagination

Host Bridge SHALL route `library.list_items`, `library.sync_snapshot`, `library.readiness_audit`, and `library.search_items` through the shared Zotero library page-query contract.

#### Scenario: Host Bridge returns a library page

- **WHEN** a client calls a paginated library capability
- **THEN** the result SHALL preserve the capability's bounded DTO shape and current-condition total count
- **AND** any `nextCursor` SHALL be an opaque string bound to the normalized criteria.

#### Scenario: Host Bridge receives an invalid cursor

- **WHEN** a library capability receives a malformed, unsupported, criteria-mismatched, or numeric cursor
- **THEN** Host Bridge SHALL return structured code `invalid_library_cursor`
- **AND** the error SHALL be non-retryable without corrected input.

## ADDED Requirements

### Requirement: Ordinary library capabilities SHALL consume canonical Broker pages
Ordinary library/item/note/payload/attachment/annotation handlers SHALL use the canonical Broker directly with trusted request control. They SHALL NOT resolve partial ordinary-read projections, invoke legacy read fallbacks, or materialize complete collections to repaginate. Missing or incomplete injected capabilities SHALL fail closed.

#### Scenario: Injected read capability is absent
- **WHEN** an ordinary library capability is not configured
- **THEN** the call fails without entering a default native fallback.

### Requirement: Host Bridge SHALL expose Saved Search discovery
Host Bridge SHALL expose library.list_saved_searches as read-only portable-ref discovery with the Broker-owned input and page semantics.

#### Scenario: Discovery is called remotely
- **WHEN** an authenticated client requests a Saved Search page
- **THEN** it receives stable refs and display names without navigation effects.
