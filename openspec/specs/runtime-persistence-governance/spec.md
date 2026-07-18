## ADDED Requirements

### Requirement: Sidecar lifecycle files remain profile and instance scoped

Runtime persistence SHALL derive all sidecar lifecycle files below the fixed
service-runtime profile directory and SHALL support atomic private text writes.

#### Scenario: Supervisor creates a session
- **WHEN** a profile-scoped sidecar session starts
- **THEN** config and lease paths SHALL remain below that profile and session
- **AND** private POSIX files SHALL use owner-only permissions.

#### Scenario: Lifecycle cleanup runs
- **WHEN** a service or supervisor cleans discovery, owner, or session state
- **THEN** it SHALL first verify matching profile, supervisor, and service
  identities
- **AND** it SHALL not delete another instance's state.
