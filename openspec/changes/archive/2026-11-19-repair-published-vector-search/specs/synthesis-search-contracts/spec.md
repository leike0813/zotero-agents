## MODIFIED Requirements

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

#### Scenario: Semantic coverage and lexical coverage differ

- **WHEN** the active publication is searched across the requested scope and a lexical scan budget is exhausted
- **THEN** the owner can report complete vector coverage alongside limited lexical work and an unknown total

#### Scenario: Semantic execution is unavailable

- **WHEN** an automatic search falls back to verified lexical results because the index or query service is unavailable
- **THEN** its method is lexical and the optional `coverage.vector` reports the vector execution status and bounded reason for unavailability
