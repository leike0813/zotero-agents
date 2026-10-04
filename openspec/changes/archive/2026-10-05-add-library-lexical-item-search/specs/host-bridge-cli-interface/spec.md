# Spec Delta

## ADDED Requirements

### Requirement: CLI Library item search SHALL preserve the canonical search contract
The `library item search` command SHALL pass its existing `--query` JSON container to `library.search_items` and return the complete canonical Broker search result and continuation without reshaping it as a list page.

#### Scenario: CLI submits a bounded lexical search
- **WHEN** a caller supplies a valid query payload with scope and pagination fields
- **THEN** the CLI invokes `library.search_items` and returns its results, status, method, coverage, issues, cursor, `hasMore`, and truthful `total`

#### Scenario: CLI continues a search
- **WHEN** a caller supplies the opaque cursor returned by the previous search page
- **THEN** the CLI forwards it unchanged in the same `--query` JSON container
- **AND** a stale cursor is returned as the canonical structured search error without retrying the search
