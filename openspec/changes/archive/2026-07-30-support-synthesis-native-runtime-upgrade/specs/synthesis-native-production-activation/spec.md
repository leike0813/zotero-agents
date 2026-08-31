## ADDED Requirements

### Requirement: Runtime activation SHALL bind the admission generation

Production admission, critical-smoke evidence, Rust activation evidence,
discovery, health, and handshake SHALL identify the same runtime-admission
generation in addition to the existing receipt, profile, service, capability,
and roster identity.

#### Scenario: Pending generation activation matches
- **WHEN** every identity and smoke field matches the pending admission generation
- **THEN** Rust persists generation-bound activation before opening mutation admission

#### Scenario: Generation is missing or stale
- **WHEN** the production admission or any activation evidence omits the generation or reports another generation
- **THEN** activation and plugin promotion fail closed

### Requirement: Promotion SHALL precede startup reconcile

The plugin SHALL atomically promote matching durable Rust activation to current
runtime admission before executing startup reconcile or publishing ready.

#### Scenario: Reconcile fails after promotion
- **WHEN** the new generation is current and startup reconcile returns an error
- **THEN** the failure is post-activation repair
- **AND** the plugin does not restore the pre-upgrade backup or previous runtime
