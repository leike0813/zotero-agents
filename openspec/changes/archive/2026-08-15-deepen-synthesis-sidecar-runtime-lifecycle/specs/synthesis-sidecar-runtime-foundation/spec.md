## ADDED Requirements

### Requirement: Production serve lifecycle SHALL have one process owner
The native Rust sidecar SHALL expose one blocking production-serve lifecycle that accepts the existing launch-config path, owns startup through terminal cleanup, and reports a typed terminal outcome without changing the executable or wire contracts.

#### Scenario: Startup fails before readiness
- **WHEN** config validation, production ownership, storage preparation, application composition, reconciliation, listener binding, or discovery publication fails
- **THEN** the sidecar SHALL NOT remain discoverable
- **AND** every resource already acquired SHALL receive failure-isolated rollback
- **AND** the original startup failure SHALL remain the primary terminal cause

#### Scenario: Sidecar commits readiness
- **WHEN** production ownership, storage, applications, reconciliation, and the loopback listener are all usable
- **THEN** the sidecar SHALL atomically publish discovery as its readiness commit
- **AND** stdout notification SHALL remain diagnostic rather than a readiness fact source

#### Scenario: Lifecycle infrastructure fails after readiness
- **WHEN** the listener, admission ownership, runtime ownership, or lifecycle coordination fails after discovery publication
- **THEN** the sidecar SHALL stop accepting new work and enter the shared bounded cleanup path
- **AND** the lifecycle failure SHALL remain observable as the primary terminal cause

#### Scenario: One operation fails
- **WHEN** one request, transfer attempt, worker operation, or background operation terminates with an operation-scoped failure
- **THEN** that operation SHALL reach its stable terminal state and release its admission
- **AND** the listener SHALL remain ready unless a lifecycle stop has independently begun

