## ADDED Requirements

### Requirement: Native worker and transfer shutdown SHALL share the existing deadline

Shutdown SHALL stop admission, wake queued operations, cancel active work, close the worker control pipe, terminate the child, and clear transfer staging within the existing 500 ms worker budget.

#### Scenario: Shutdown begins with mixed work
- **WHEN** one paged transfer is active and two direct or paged operations are queued
- **THEN** every operation SHALL reach terminal cancellation
- **AND** no child or transfer attempt SHALL remain after shutdown

#### Scenario: Lease loss or stdin EOF stops the service
- **WHEN** either lifecycle signal ends the native process
- **THEN** the same pool and transfer cleanup path SHALL run
- **AND** no orphan child SHALL remain
