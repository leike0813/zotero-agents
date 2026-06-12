## ADDED Requirements

### Requirement: Startup SHALL cancel stale Synthesis runtime operations
Synthesis startup reconciliation SHALL cancel persisted running operation rows from a prior plugin process before those rows are surfaced as active Workbench jobs.

#### Scenario: Running operation left by previous session
- **GIVEN** a Synthesis operation row is persisted with status `running`
- **WHEN** the plugin performs startup runtime work reconciliation
- **THEN** the operation SHALL be updated to `canceled`
- **AND** its diagnostics SHALL include `synthesis_operation_stale_after_restart`
- **AND** Workbench background jobs SHALL NOT count it as running.

#### Scenario: Runtime stale guard remains available
- **GIVEN** a Synthesis operation row remains `running` during the current session
- **WHEN** it exceeds the runtime stale threshold
- **THEN** the existing runtime stale guard SHALL cancel it with the same stale-after-restart diagnostic.
