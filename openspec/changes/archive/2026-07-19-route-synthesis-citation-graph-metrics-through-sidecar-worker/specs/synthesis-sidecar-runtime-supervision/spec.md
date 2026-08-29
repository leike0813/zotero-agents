## ADDED Requirements

### Requirement: Metrics calls bind to the current runtime identity
The production metrics adapter SHALL resolve a ready connection per call and the
compute client SHALL validate echoed request and service-instance identities.

#### Scenario: Supervisor restarts between calls
- **WHEN** a later metrics call begins after the sidecar runtime restarts
- **THEN** it uses the new discovery identity rather than a cached connection

#### Scenario: Stale runtime response arrives
- **WHEN** a metrics response identifies a different request or service instance
- **THEN** the client fails with `runtime_mismatch` and does not promote the result

### Requirement: Lifecycle cancellation covers metrics work
The runtime SHALL stop admission and cancel or terminate active metrics work
under the existing lifecycle budgets on Host EOF, lease expiry, authenticated
shutdown, supervisor stop, and composition shutdown.

#### Scenario: Composition shuts down during metrics compute
- **WHEN** the composition lifecycle signal aborts an active metrics call
- **THEN** the request is canceled and no late result is accepted
