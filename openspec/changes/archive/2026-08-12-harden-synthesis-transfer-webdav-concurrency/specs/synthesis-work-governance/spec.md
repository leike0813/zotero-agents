## ADDED Requirements

### Requirement: Public maintenance controllers SHALL have composition lifecycle ownership

Every accepted public maintenance controller SHALL be registered with the current native composition before its thread starts. Shutdown SHALL close controller admission, request cancellation, and drain registered controllers before storage close. Cancellation observed before promotion SHALL publish one durable canceled terminal and no later promotion.

#### Scenario: Shutdown races accepted maintenance work

- **WHEN** shutdown begins after a maintenance receipt is accepted but before promotion
- **THEN** the registered controller SHALL observe cancellation at its promotion boundary
- **AND** its receipt SHALL converge to one canceled or already-established terminal without a later unreported commit.
