## ADDED Requirements

### Requirement: Maintenance projections share one safe contract
Synthesis maintenance status, schema summaries, paging bounds, canonicalization, and snapshot diff SHALL use shared strict projection builders while production mutation ownership and public results remain unchanged.

#### Scenario: Production and private status are projected
- **WHEN** either composition requests status, schema, cache, operation, or diff information
- **THEN** both SHALL apply the same JSON-safety, redaction, ordering, cursor, truncation, and diagnostic rules

#### Scenario: Production-only maintenance remains in production
- **WHEN** migration inventory classifies legacy JSON import, Host paper details, a production profiler source, or clean-install reset
- **THEN** those capabilities SHALL remain with their current safe production owner and SHALL NOT be copied into Node
