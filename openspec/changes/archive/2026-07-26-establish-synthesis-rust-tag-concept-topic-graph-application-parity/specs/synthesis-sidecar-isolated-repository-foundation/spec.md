## ADDED Requirements

### Requirement: Rust repository SHALL expose typed Tag Concept and Topic Graph aggregates
The Rust repository SHALL provide bounded typed reads, CRUD, complete aggregate replacement, and narrow index promotion for the existing Tag, Concept, and Topic Graph tables without schema or index changes.

#### Scenario: Aggregate replacement encounters a fault
- **WHEN** an expected-basis transaction loses its CAS or any row write fails
- **THEN** every row in that aggregate remains at the prior committed state
- **AND** application policy is not evaluated inside the repository
