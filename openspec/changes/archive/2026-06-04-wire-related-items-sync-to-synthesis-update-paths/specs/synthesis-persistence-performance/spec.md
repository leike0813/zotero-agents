## ADDED Requirements

### Requirement: Full related-items sync is batched and bounded by accepted edges

Full related-items sync SHALL process accepted library-to-library citation edges in batches and yield between batches. It SHALL avoid per-edge full graph hash recomputation and SHALL cache binding lookups within a sync run.

#### Scenario: Full sync processes many edges

- **WHEN** full related-items sync runs over many accepted edges
- **THEN** it SHALL report progress through its own operation
- **AND** it SHALL yield control between batches
- **AND** it SHALL NOT recompute the entire graph state for every edge.
