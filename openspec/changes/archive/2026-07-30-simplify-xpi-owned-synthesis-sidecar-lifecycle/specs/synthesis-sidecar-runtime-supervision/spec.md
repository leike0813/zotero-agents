## MODIFIED Requirements

### Requirement: The plugin SHALL launch only verified native manifest v2

The plugin SHALL launch only the verified current XPI installation. Each launch
SHALL use fresh credentials and a unique session directory containing its
config and discovery. Readiness SHALL require one current-session health and
protocol handshake.

#### Scenario: Current session publishes readiness
- **WHEN** discovery, health, and handshake match the launch profile, session, protocol, bundle, and live service instance
- **THEN** the plugin publishes the native client

### Requirement: Forced native stop SHALL not leave a worker process

The plugin SHALL keep a parent control pipe open for the child lifetime. Normal
shutdown SHALL request bounded graceful shutdown and retain forced termination
as fallback. Parent pipe EOF SHALL stop the sidecar.

#### Scenario: Parent exits unexpectedly
- **WHEN** the sidecar observes EOF on its parent control pipe
- **THEN** it stops workers, closes production storage, releases the production lock, and exits

### Requirement: Supervision SHALL pin one admitted runtime generation

Supervision SHALL launch one in-memory task for the verified current XPI
installation. Rust SHALL hold one exclusive OS lock for the production roots.
No admission generation, owner JSON, lease, global discovery, or persisted
service instance SHALL participate in startup.

#### Scenario: Duplicate launch is requested
- **WHEN** the plugin calls start more than once during one lifecycle
- **THEN** callers share the same in-flight or ready owner task

#### Scenario: Another sidecar holds production
- **WHEN** a second process cannot acquire the production lock
- **THEN** it exits with `production_lock_conflict` without modifying production

#### Scenario: Normal restart creates a new instance
- **WHEN** the previous sidecar has stopped and a new launch receives another service instance ID
- **THEN** startup succeeds because instance identity is scoped to the new live connection
