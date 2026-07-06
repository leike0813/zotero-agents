## MODIFIED Requirements

### Requirement: ACP skills active task projections SHALL use ACP status classifiers

ACP Skills SHALL classify dashboard, toolbar, run drawer, workflow task sync,
and Host Bridge active task liveness through the shared ACP status helpers.
`failed_retriable` SHALL be visible as active/recoverable. Terminal
`succeeded`, `failed`, and `canceled` SHALL be excluded from active task lists
unless a view explicitly requests history.

ACP active task projections SHALL be derived from ACP run store active
summaries. Legacy ACP workflow task rows SHALL NOT decide active visibility,
status, sorting, or metadata, and SHALL NOT be used as fallback records.

#### Scenario: Failed retriable remains active

- **GIVEN** an ACP Skills run has status `failed_retriable`
- **WHEN** dashboard, toolbar, ACP panel, or Host Bridge active task summaries
  are computed
- **THEN** the run SHALL remain visible as an active or actionable task
- **AND** the summary SHALL expose connect and cancel task affordances when the
  recovery/session axes allow them.

#### Scenario: Terminal failed is not active

- **GIVEN** an ACP Skills run has terminal status `failed`
- **WHEN** active task summaries are computed
- **THEN** the run SHALL be excluded from active lists
- **AND** it SHALL NOT be offered as an auto-continuation candidate.

#### Scenario: Workflow task state does not expand

- **GIVEN** an ACP Skills run has status `failed_retriable`
- **WHEN** the run is projected into workflow task rows or Host Bridge active
  task handles
- **THEN** the projection SHALL use existing workflow task states such as
  `running` or `waiting_user`
- **AND** recoverability SHALL be expressed through ACP summary status,
  liveness, and action flags.

#### Scenario: Startup reprojects waiting ACP run

- **GIVEN** a persisted ACP Skills run has status `waiting_user`
- **AND** no legacy ACP workflow task row exists for that request
- **WHEN** ACP run records are hydrated after plugin startup
- **THEN** active summaries SHALL include that run
- **AND** Dashboard, toolbar, workspace attention, and Host Bridge active reads
  SHALL project it as active from the ACP run summary.

#### Scenario: Startup reprojects failed retriable ACP run

- **GIVEN** a persisted ACP Skills run has status `failed_retriable`
- **AND** no legacy ACP workflow task row exists for that request
- **WHEN** ACP run records are hydrated after plugin startup
- **THEN** active summaries SHALL include that run
- **AND** active task projections SHALL expose it as recoverable/actionable.

#### Scenario: Legacy ACP task row is ignored

- **GIVEN** a legacy ACP workflow task row exists for a request
- **AND** the ACP run store has no active ACP run for that request
- **WHEN** active task projections are computed
- **THEN** the legacy row SHALL NOT create an ACP active task
- **AND** it SHALL NOT provide fallback metadata for another ACP active task.
