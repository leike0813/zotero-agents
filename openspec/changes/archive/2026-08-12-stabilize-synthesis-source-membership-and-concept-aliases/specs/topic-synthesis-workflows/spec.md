## ADDED Requirements

### Requirement: Discovery-driven topic updates use the full update path

The Synthesis service SHALL route an update requested because open discovery candidates exist through `update_full`.

#### Scenario: Candidate-triggered update intent

- **GIVEN** a topic has open discovery candidates and no higher-priority repair condition
- **WHEN** the Workbench derives its topic update intent
- **THEN** the mode SHALL be `update_full`
- **AND** discovery SHALL be included in the update scope.

### Requirement: Discovery outcomes are committed atomically with successful apply

Topic apply SHALL commit discovery candidate outcomes only after the topic update has passed validation and concurrency checks and its canonical artifacts have been written.

#### Scenario: Successful apply accepts and screens exact hints

- **WHEN** a valid update is applied successfully
- **THEN** exact candidate hint IDs marked accepted in the resolver manifest SHALL become `accepted`
- **AND** exact candidate hint IDs marked screened out SHALL become `screened_out` with their evidence basis and triage outcome.

#### Scenario: Failed apply preserves discovery state

- **WHEN** validation, CAS, or canonical writing fails
- **THEN** no discovery hint status or outcome SHALL change.
