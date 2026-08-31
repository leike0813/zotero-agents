## ADDED Requirements

### Requirement: Rust repository SHALL expose Citation and Reference typed application rows
The Rust repository SHALL expose typed CRUD, explicit bounded reads, compare-and-swap replacement, and atomic promotion for the existing Citation Graph, Reference Refresh, and Reference Matching/Review table families. It SHALL not add tables, indexes, migrations, generic application state, or application policy.

#### Scenario: A basis-guarded promotion fails
- **WHEN** the expected active basis is stale or any SQL statement fails before commit
- **THEN** the repository SHALL return a stable failure and retain the complete last-good projection.
