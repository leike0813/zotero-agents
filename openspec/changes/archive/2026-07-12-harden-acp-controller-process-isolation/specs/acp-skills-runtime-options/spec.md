## ADDED Requirements

### Requirement: ACP connection tests and cache refresh SHALL isolate temporary controllers
ACP connection tests and cache refresh operations SHALL close only the temporary controller created for that operation.

#### Scenario: Successful temporary probe closes its controller
- **WHEN** a connection test or cache refresh succeeds
- **THEN** it SHALL complete and close its temporary shared controller once
- **AND** it SHALL preserve the successful cache result.

#### Scenario: Failed temporary probe closes its controller
- **WHEN** initialize times out, session creation fails, a write fails, or the diagnostic is cancelled
- **THEN** it SHALL settle through the same bounded shared-controller close.

#### Scenario: Existing engine remains isolated
- **GIVEN** another ACP controller is active
- **WHEN** a temporary connection test or cache refresh controller closes
- **THEN** it SHALL NOT signal or close the existing controller or unrelated desktop-session processes.

