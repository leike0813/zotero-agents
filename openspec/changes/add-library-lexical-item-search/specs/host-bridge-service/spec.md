# Spec Delta

## MODIFIED Requirements

### Requirement: Host Bridge library reads share opaque keyset pagination
Host Bridge SHALL route `library.list_items`, `library.sync_snapshot`, and `library.readiness_audit` through the shared Zotero library page-query contract, and SHALL route `library.search_items` through the canonical Broker lexical search contract.

#### Scenario: Host Bridge returns a library page
- **WHEN** a client calls a paginated list, snapshot, or readiness capability
- **THEN** the result SHALL preserve the capability's bounded DTO shape and current-condition total count
- **AND** any `nextCursor` SHALL be an opaque string bound to the normalized criteria

#### Scenario: Host Bridge returns a lexical item search
- **WHEN** a client calls `library.search_items` with a valid search request
- **THEN** the result SHALL preserve the Broker's shared search envelope, item aggregation, method, coverage, issues, and continuation semantics
- **AND** it SHALL NOT convert the search into a list page or return the legacy `{items, truncated}` wrapper

#### Scenario: Host Bridge receives an invalid cursor
- **WHEN** a list, snapshot, or readiness capability receives a malformed, unsupported, criteria-mismatched, or numeric cursor
- **THEN** Host Bridge SHALL return structured code `invalid_library_cursor`
- **AND** the error SHALL be non-retryable without corrected input

#### Scenario: Host Bridge receives a stale search cursor
- **WHEN** `library.search_items` receives an expired cursor or a cursor whose query, scope, method, ordering, or source-version basis is stale
- **THEN** Host Bridge SHALL preserve the canonical Broker cursor/basis error and SHALL NOT rerun the search

## ADDED Requirements

### Requirement: Library item search SHALL use the canonical Broker owner
The Host Bridge `library.search_items` handler SHALL validate and project search requests through `ZoteroHostCapabilityBroker.library.searchItems` and SHALL preserve its complete bounded result contract.

#### Scenario: Search capability is unavailable
- **WHEN** the Broker search member is missing from the injected capability
- **THEN** Host Bridge SHALL fail closed with the established unavailable capability error and SHALL NOT call the list page query as a fallback

#### Scenario: Search result is mirrored through MCP
- **WHEN** an MCP client calls the existing library item search tool
- **THEN** MCP SHALL return the same Broker-backed search data and stable error semantics as Host Bridge
