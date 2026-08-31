## ADDED Requirements

### Requirement: Compute capacity does not expand production ownership
The larger compute envelope SHALL NOT route production Synthesis calls, grant
service mutation authority, or change the eight-engine migration inventory.

#### Scenario: Capacity change is validated
- **WHEN** service boundary and migration governance run
- **THEN** layout remains a non-production worker canary, `mutationEnabled` remains false, and inventory remains `108 methods / 1 direct consumer`

### Requirement: Capacity implementation remains dependency-minimal
The service SHALL implement the bounded JSON envelope without compression,
streaming files, child processes, new endpoints, or new third-party packages.

#### Scenario: Runtime boundary is inspected
- **WHEN** static and packaging checks inspect the capacity implementation
- **THEN** no new authority, dependency, or runtime asset is required
