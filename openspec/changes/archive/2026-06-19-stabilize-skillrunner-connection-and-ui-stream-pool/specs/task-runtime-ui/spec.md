## ADDED Requirements

### Requirement: SkillRunner run workspace MUST preserve warm stream session state

The SkillRunner run workspace SHALL separate selected-task projection from
per-run chat stream session state.

#### Scenario: warm run state remains available after selection changes

- **WHEN** a selected running run is switched to the warm stream pool
- **THEN** its messages and cursor SHALL remain associated with that request id
- **AND** returning to that run SHALL render the preserved session without
  forcing a reconnect

#### Scenario: warm stream does not drive unrelated selected UI

- **WHEN** a warm non-selected run receives chat stream frames
- **THEN** those frames SHALL update that run's session state
- **AND** the currently selected run's transcript SHALL NOT be replaced by the
  warm run's transcript

#### Scenario: backend-gated workspace releases streams

- **WHEN** a backend becomes reconcile-gated or the run workspace closes
- **THEN** all UI stream sessions owned by that backend/workspace SHALL be
  aborted
- **AND** task history/projection rows SHALL remain preserved

### Requirement: SkillRunner workspace selection MUST be user-driven

SkillRunner run workspace selection SHALL change only from explicit user UI
actions and SHALL NOT be driven by provider progress or temporary request
placeholders.

#### Scenario: newly submitted SkillRunner run does not steal focus

- **WHEN** a SkillRunner job emits `request-created` or `request-ready`
- **THEN** plugin SHALL register the run for projection and settlement
- **AND** plugin SHALL NOT change the currently selected SkillRunner run

#### Scenario: request-created job is not user-visible before request-ready

- **WHEN** a SkillRunner job is queued, running, or has emitted
  `request-created` but has not emitted `request-ready`
- **THEN** task runtime and dashboard history SHALL NOT expose that job as a
  SkillRunner run row
- **AND** the SkillRunner run store SHALL NOT create a projectable run record
  for that job

#### Scenario: missing projection is not represented as a temporary task

- **WHEN** a request id is known from provider progress but the SkillRunner run
  store has not exposed a projection for it
- **THEN** the workspace SHALL NOT synthesize a selectable temporary task row
- **AND** the task SHALL appear only after the run store projection exists

#### Scenario: refresh does not auto-pick fallback run

- **WHEN** workspace data refreshes without a user-selected task key
- **THEN** the currently selected visible run SHALL remain selected
- **AND** if the current run is unavailable, the workspace SHALL show no
  selected run instead of selecting the newest or first visible task
