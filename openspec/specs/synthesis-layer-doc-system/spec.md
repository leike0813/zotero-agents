## Purpose

Synthesis docs describe Zotero Library SSOT, sidecar cache, explicit operations, and destructive hard-cut cleanup.
## Requirements
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

