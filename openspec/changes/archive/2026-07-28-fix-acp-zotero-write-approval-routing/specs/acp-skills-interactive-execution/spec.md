## ADDED Requirements

### Requirement: ACP Skills SHALL serialize visible permission requests per run

ACP Skills SHALL retain permission requests per run in arrival order, project the queue head, and correlate resolution with the active permission request ID.

#### Scenario: Two run approvals overlap

- **WHEN** one ACP Skills run receives two permission requests before either is resolved
- **THEN** the first request SHALL remain visible until it is resolved
- **AND** the second request SHALL then become visible
- **AND** both resolvers SHALL reach exactly one terminal outcome.

#### Scenario: A run owner is removed

- **WHEN** a run controller is removed with unresolved permission requests
- **THEN** every unresolved request for that run SHALL be settled as cancelled.
