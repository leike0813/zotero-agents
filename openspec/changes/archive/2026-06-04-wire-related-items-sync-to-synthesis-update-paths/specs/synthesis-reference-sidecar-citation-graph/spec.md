## ADDED Requirements

### Requirement: Related-items sync follows explicit sidecar update paths

Literature-digest sidecar apply, Reference Sidecar refresh, and Advanced Matching SHALL be allowed to trigger a visible related-items sync operation after their own fact updates and graph refresh attempts.

#### Scenario: Digest apply triggers scoped related-items sync

- **WHEN** literature-digest apply updates sidecar facts for one source ref
- **THEN** the service SHALL attempt graph incremental refresh for that source ref
- **AND** it SHALL then run related-items sync scoped to that source ref
- **AND** graph refresh failure SHALL NOT block related-items sync.

#### Scenario: Sidecar refresh triggers scoped related-items sync

- **WHEN** Reference Sidecar refresh changes references artifact state for source refs
- **THEN** related-items sync SHALL run only for those changed source refs.

#### Scenario: Advanced Matching triggers full related-items sync after graph-affecting facts

- **WHEN** Advanced Matching writes accepted binding or canonical redirect facts
- **THEN** related-items sync SHALL run as a full sync
- **AND** open review proposals alone SHALL NOT require related-items sync.

### Requirement: Related-items sync resolves edges without requiring graph cache

Related-items sync SHALL use graph cache only as an optimization. If graph cache is missing, stale, failed, empty, or refresh fails, it SHALL compute accepted library-to-library citation edges directly from active sidecar facts.

#### Scenario: Graph cache is unavailable

- **GIVEN** active raw references and accepted reference bindings exist
- **AND** Citation Graph cache is missing or failed
- **WHEN** related-items sync runs
- **THEN** it SHALL compute source-to-target library edges from active sidecar facts
- **AND** it SHALL NOT rebuild graph cache.
