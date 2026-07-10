## ADDED Requirements

### Requirement: ACP sequence step cleanup SHALL form a downstream dispatch barrier

Workflow execution SHALL finish successful non-final ACP sequence-step lifecycle cleanup after optional step result apply and before dispatching a later sequence step.

#### Scenario: Intermediate step without apply result settles before continuation
- **GIVEN** a non-final ACP sequence step does not declare `apply_result`
- **WHEN** the step succeeds
- **THEN** Host SHALL settle and detach that step's local controller before starting the next step
- **AND** apply-result state persistence SHALL NOT independently start controller cleanup.

#### Scenario: Intermediate step with apply result settles after apply
- **GIVEN** a non-final ACP sequence step declares `apply_result`
- **WHEN** the backend succeeds and the declared apply completes
- **THEN** Host SHALL settle and detach the controller after apply and before starting the next step.

#### Scenario: Short-circuit step settles before sequence return
- **WHEN** a successful ACP sequence step matches a declared short-circuit rule
- **THEN** Host SHALL complete that step's required controller cleanup before returning the short-circuit result.

#### Scenario: Cleanup and downstream initialization do not overlap
- **WHEN** controller detach for a completed non-final ACP sequence step remains pending
- **THEN** Host SHALL NOT dispatch or initialize the next sequence step until the detach operation settles.
