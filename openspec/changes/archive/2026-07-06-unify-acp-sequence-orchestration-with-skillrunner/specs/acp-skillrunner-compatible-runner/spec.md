## MODIFIED Requirements

### Requirement: ACP sequence steps SHALL be concrete ACP skill runs

ACP Skills SHALL store and expose only concrete ACP session or sequence step
runs in the ACP run store. A `skillrunner.sequence.v1` root workflow SHALL NOT
be represented as an ACP skill run summary.

#### Scenario: ACP sequence step uses step identity

- **GIVEN** an ACP `skillrunner.sequence.v1` step creates backend request
  `request-1`
- **WHEN** ACP foreground run registration records the step
- **THEN** the ACP run record SHALL use `request-1` as request id
- **AND** `runId` SHALL equal the workflow run id
- **AND** `jobId` SHALL equal `<sequenceJobId>:<sequenceStepId>`
- **AND** the record SHALL include `sequenceStepId`, `sequenceStepIndex`, and
  `sequenceFinalStepId` when known.

#### Scenario: ACP run summary derives sequence role

- **GIVEN** an ACP run summary has a non-empty `sequenceStepId`
- **WHEN** Dashboard or Host Bridge materializes a DTO
- **THEN** the DTO MAY expose `sequenceRole = "sequence_step"`
- **AND** the role SHALL be derived, not persisted as the source of truth.

#### Scenario: ACP startup reconcile does not create root runs

- **WHEN** ACP startup reconcile processes persisted runs and legacy task rows
- **THEN** it SHALL NOT create ACP run records from workflow sequence root
  state
- **AND** it SHALL only clean legacy ACP task rows or normalize concrete ACP
  run state.
