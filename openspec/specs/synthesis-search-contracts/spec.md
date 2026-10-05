# synthesis-search-contracts Specification

## Purpose

Defines the shared request, result, and paging behavior used by Library item, Topic, and Library evidence search so each owner can add lexical search without changing the common caller contract.

## Requirements

### Requirement: Search requests SHALL use a bounded common query and paging contract
Every public search request SHALL use a non-empty text query, an optional page limit from 1 through 100 with default 25, an optional per-round maximum from 1 through 500 with default 100, and an opaque continuation cursor.

#### Scenario: Search request is valid
- **WHEN** a caller supplies a non-blank query and in-range paging values
- **THEN** the owner executes the request using the supplied values and defaults

#### Scenario: Search request is invalid
- **WHEN** a query is blank or a paging value is outside its allowed range
- **THEN** the owner rejects the request through the existing invalid-request error contract

### Requirement: Search results SHALL report actual execution and bounded coverage
Every search result SHALL contain results, status, actual method, bounded coverage and issues, nullable nextCursor, hasMore, and total; it SHALL NOT expose a public relevance score.

#### Scenario: Lexical search completes
- **WHEN** a lexical search completes within its source and result bounds
- **THEN** status is completed, method is lexical, and the result reports coverage and issues for the work actually performed

#### Scenario: Search is incomplete or unavailable
- **WHEN** a source cannot be read or a work bound prevents complete search
- **THEN** status distinguishes limited from unavailable and bounded issues explain the condition without representing it as an ordinary zero-hit result

#### Scenario: Total cannot be proven
- **WHEN** the owner cannot determine the exact number of matching results in the declared scope
- **THEN** total is null and is not inferred from a page, candidate bound, or per-round maximum

### Requirement: Search cursors SHALL freeze the current result basis
A continuation cursor SHALL bind the query, filters, scope, method/version, ordering, and current source basis for one bounded result round.

#### Scenario: Continuation basis remains current
- **WHEN** the cursor is valid and its bound basis remains current
- **THEN** the owner returns the next page from the same ordered result round

#### Scenario: Continuation basis changes or expires
- **WHEN** a cursor is invalid, expired, or its bound search basis changed
- **THEN** the owner returns the existing cursor or stale-basis error and does not silently rerun the search

### Requirement: Search ordering SHALL be deterministic without a public score
Lexical results SHALL use matched-unit coverage, phrase match, declared field priority, and stable result identity as deterministic ordering keys, without term-frequency ranking or a public numeric score.

#### Scenario: Equal lexical matches are ordered
- **WHEN** two results have equal coverage, phrase, and field-priority keys
- **THEN** stable result identity determines their order independently of input enumeration order

#### Scenario: A result is projected
- **WHEN** the owner returns a lexical match
- **THEN** the result contains no public relevance score or term-frequency-derived rank
