## ADDED Requirements

### Requirement: Workbench shows literature rebuild freshness

Synthesis Workbench SHALL show Literature Registry and Citation Graph job/freshness state.

#### Scenario: Literature projection is stale or missing

- **WHEN** snapshot state reports stale or missing literature projection
- **THEN** Workbench SHALL show freshness status and a rebuild command
- **AND** it SHALL not block rendering while a full rebuild runs.

#### Scenario: Literature rebuild failed retryably

- **WHEN** job state is `failed_retryable`
- **THEN** Workbench SHALL show retry state and expose a retry command.

### Requirement: Workbench routes literature rebuild commands

Synthesis Workbench SHALL route literature rebuild/retry host commands to the Synthesis service.

#### Scenario: Manual rebuild is requested

- **WHEN** the user requests a literature rebuild
- **THEN** Workbench SHALL dispatch a host command that runs the literature background job immediately.
