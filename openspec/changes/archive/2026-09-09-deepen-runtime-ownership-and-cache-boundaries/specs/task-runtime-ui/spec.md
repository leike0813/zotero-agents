## MODIFIED Requirements

### Requirement: SkillRunner UI projection MUST derive display facts dynamically

SkillRunner task UI MUST derive lifecycle and display facts from the current SkillRunner run projection. Generic task storage and active indexes MUST NOT hydrate, copy, persist, or own SkillRunner lifecycle projections.

#### Scenario: Backend connection data comes from backend registry

- **GIVEN** a SkillRunner run has `backendId`
- **WHEN** the task runtime projects the run for UI
- **THEN** it MUST resolve backend connection data from the backend registry at
  use time
- **AND** it MUST NOT treat a persisted `backendBaseUrl` snapshot as lifecycle
  truth.

#### Scenario: Skill name comes from skill registry

- **GIVEN** a SkillRunner run has optional `skillId`
- **WHEN** the task runtime projects the run for UI
- **THEN** it MUST resolve `skillName` from the skill registry or prepared
  `skillDisplayById`
- **AND** it MAY fall back to `skillId` and then `taskName`
- **AND** it MUST NOT require `skillLabel`.

#### Scenario: Workflow and sequence labels are projected

- **GIVEN** a SkillRunner run has `workflowId` and optional sequence association
  ids
- **WHEN** the task runtime projects the run for UI
- **THEN** it MUST resolve `workflowLabel` from the workflow registry with
  fallback to `workflowId`
- **AND** it MUST resolve `sequenceStepIndex` and `sequenceFinalStepId` from
  `SequenceRunState` when sequence state is available.

#### Scenario: Run Store terminal state is visible without explicit synchronization

- **GIVEN** a SkillRunner run is visible in an active task summary
- **WHEN** its Run Store projection becomes terminal
- **THEN** the next task summary read MUST use that terminal projection
- **AND** the run MUST disappear from active summaries without an explicit copy or synchronization step.

#### Scenario: Dashboard refresh cache does not own lifecycle truth

- **WHEN** Dashboard reuses a revision-scoped or dirty-gated task-row projection
- **THEN** that cache MAY avoid redundant UI projection work
- **AND** a cache miss MUST still derive SkillRunner rows from the Run Store
- **AND** the cache MUST NOT become the correctness source for lifecycle state.
