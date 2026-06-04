## ADDED Requirements

### Requirement: Cluster Dedupe Fact Changes SHALL Stale Citation Graph Cache
Advanced Reference Matching cluster dedupe SHALL affect Citation Graph only
through accepted redirect facts.

#### Scenario: Cluster redirect is written
- **WHEN** production advanced matching writes a canonical redirect from a
  cluster redirect action
- **THEN** `citation-graph:library` SHALL be marked stale
- **AND** graph data rows SHALL NOT be rebuilt in the same operation.

#### Scenario: Cluster review proposal is written
- **WHEN** production advanced matching writes an open `canonical_merge`
  proposal from a cluster review action
- **THEN** it SHALL NOT create accepted graph edges
- **AND** it SHALL NOT rebuild graph data.
