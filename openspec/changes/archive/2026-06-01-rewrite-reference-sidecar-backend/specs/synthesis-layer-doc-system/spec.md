## ADDED Requirements

### Requirement: Docs describe active sidecar backend semantics
Synthesis layer docs SHALL describe Reference Sidecar refresh and Citation Graph cache rebuild as separate explicit operations.

#### Scenario: Docs mention refresh and graph cache
- **WHEN** active docs describe Reference Sidecar refresh
- **THEN** they SHALL state that refresh updates sidecar rows and may mark graph cache stale
- **AND** they SHALL NOT state that refresh synchronously rebuilds graph cache.

#### Scenario: Docs describe readiness
- **WHEN** active docs describe sidecar or graph readiness
- **THEN** they SHALL name cache basis as the data readiness source
- **AND** they SHALL not name legacy sidecar state files, sidecar index files, or graph index files as runtime readiness sources.
