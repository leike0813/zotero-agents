## ADDED Requirements

### Requirement: Citation graph exposes topic-scoped cluster statistics

Citation graph services SHALL expose bounded topic-scoped cluster data for
deterministic topic synthesis statistics.

#### Scenario: Topic source refs are queried

- **WHEN** a topic synthesis runtime asks for a cluster around resolved source
  paper refs
- **THEN** the graph service SHALL return counts and summaries for source
  papers, internal edges, external references, canonical references, unresolved
  references, year span, role hints, and graph status
- **AND** the response SHALL be bounded by explicit node/reference limits.

#### Scenario: Graph cache is stale

- **WHEN** cluster data cannot be trusted because graph/cache state is stale
- **THEN** the response SHALL include a structured stale diagnostic
- **AND** it SHALL NOT trigger graph rebuild or refresh as part of the read.
