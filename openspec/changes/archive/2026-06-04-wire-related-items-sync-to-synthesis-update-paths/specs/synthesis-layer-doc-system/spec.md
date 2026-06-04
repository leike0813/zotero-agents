## ADDED Requirements

### Requirement: Synthesis docs describe related-items sync as graph-optional

Active Synthesis documentation SHALL describe related-items sync as an independent visible operation that may use graph cache as a fast path but can compute accepted library-to-library edges from sidecar facts.

#### Scenario: Docs describe update ordering and independence

- **WHEN** a user reads runtime or citation graph documentation
- **THEN** it SHALL state that related-items sync runs after graph refresh attempts
- **AND** it SHALL state that graph cache success is not a correctness precondition
- **AND** it SHALL state that related-items sync does not rebuild graph cache.
