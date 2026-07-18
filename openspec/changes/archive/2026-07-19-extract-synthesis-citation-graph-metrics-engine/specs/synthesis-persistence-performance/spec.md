## ADDED Requirements

### Requirement: Citation graph complex metrics SHALL use bounded lock sections

Citation Graph complex metrics refresh SHALL hold the per-library write lock only while capturing a consistent graph basis or promoting records against that basis.

#### Scenario: CPU computation is in progress

- **WHEN** PageRank, weak components, or role scoring is running
- **THEN** the per-library write lock SHALL be released
- **AND** unrelated bounded graph maintenance SHALL be able to acquire the lock.

#### Scenario: Computed records are promoted

- **WHEN** a metrics result is ready for persistence
- **THEN** the promotion lock section SHALL only re-read the current graph basis, validate it, and transactionally replace complex metrics when unchanged.

### Requirement: Citation graph readiness SHALL not depend on complex metrics success

Committed Citation Graph structure SHALL remain a readable cache projection when complex metrics computation fails or is superseded.

#### Scenario: Metrics computation fails after graph commit

- **WHEN** a full or incremental graph refresh has committed structure and the metrics engine subsequently fails
- **THEN** graph structure and cache readiness SHALL remain available
- **AND** metrics reads SHALL use the existing stale or missing semantics rather than marking the graph structure unavailable.
