## MODIFIED Requirements

### Requirement: Startup SHALL cancel stale Synthesis runtime operations

Synthesis startup reconciliation SHALL cancel persisted running operation rows from a prior plugin process before those rows are surfaced as active Workbench jobs. Ordinary progress, chrome, client, debug, and service-construction paths SHALL remain read-only and SHALL NOT cancel running operations based on elapsed timestamp age.

#### Scenario: Running operation left by previous session

- **GIVEN** a Synthesis operation row is persisted with status `running`
- **WHEN** the plugin performs startup runtime work reconciliation
- **THEN** the operation SHALL be updated to `canceled`
- **AND** its diagnostics SHALL include `synthesis_operation_stale_after_restart`
- **AND** Workbench background jobs SHALL NOT count it as running.

#### Scenario: Running operation is read during the current session

- **GIVEN** a Synthesis operation row remains `running` during the current session regardless of its timestamp age
- **WHEN** an ordinary progress, chrome, client, debug, or service-construction path executes
- **THEN** the operation SHALL remain `running`
- **AND** only an explicit startup reconciliation SHALL classify persisted running state as a restart orphan.
