## ADDED Requirements

### Requirement: Active docs hard-cut old synchronization model
Active Synthesis docs and specs SHALL describe Zotero Library SSOT, sidecar cache, explicit operations, and removal of dirty-event/WorkItem/startup-reconcile synchronization.

#### Scenario: Developer reads active docs
- **WHEN** active docs discuss runtime, state machines, events, sequences, rebuild, or maintenance
- **THEN** they SHALL identify dirty events, WorkItems, WorkRuns, startup reconcile, queue drain, and Registry rebuild as removed implementation targets
- **AND** they SHALL NOT describe them as legacy mechanisms that may remain in active implementation.

### Requirement: Active docs define destructive cleanup expectations
Active docs SHALL state that this hard cut permits destructive Synthesis sidecar schema replacement and removal of old runtime tables.

#### Scenario: Implementation plan is reviewed
- **WHEN** a developer prepares implementation tasks
- **THEN** the docs SHALL require removal of old tables, APIs, UI projection, and tests
- **AND** they SHALL reject no-op compatibility shims for the old synchronization model.

## REMOVED Requirements

### Requirement: Active docs SHALL define external source drift fan-out limits
**Reason**: Startup drift fan-out is removed rather than bounded.
**Migration**: Direct reads and explicit inspect/refresh diagnostics replace startup drift handling.

### Requirement: Active docs SHALL define staged Registry rebuild promotion
**Reason**: Registry rebuild is removed.
**Migration**: Sidecar cache refresh failure preserves previous cache.

### Requirement: Worker documentation defines WorkItem governance
**Reason**: WorkItem governance is removed.
**Migration**: Document explicit operations.
