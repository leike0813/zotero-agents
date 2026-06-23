## ADDED Requirements

### Requirement: SkillRunner task rows MUST be keyed by runKey

Task runtime UI MUST use `runKey` as the stable key for SkillRunner rows across submit, observation, waiting, terminal, and apply states.

#### Scenario: Request-created updates the same row

- **GIVEN** a SkillRunner task row is visible with `runKey` and no `requestId`
- **WHEN** request creation returns a `requestId`
- **THEN** the task runtime UI MUST update the same row
- **AND** it MUST NOT replace it with a row keyed by `requestId`.

#### Scenario: Request-ready remains the same row

- **GIVEN** a SkillRunner task row has `runKey` and `requestId`
- **WHEN** the submit phase becomes `request_ready`
- **THEN** the task runtime UI MUST keep the same row visible and recoverable.

### Requirement: SkillRunner UI projection MUST derive display facts dynamically

SkillRunner task UI MUST derive display facts from the run projection and MUST NOT persist or own lifecycle facts.

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

### Requirement: Observer detached state MUST preserve visible SkillRunner rows

The task runtime UI MUST keep active SkillRunner rows visible when observation is detached after backend request creation.

#### Scenario: Detached observer keeps row visible

- **GIVEN** a SkillRunner run has `requestId`
- **WHEN** projection reports `observerState = "detached"`
- **THEN** the task runtime UI MUST keep the row visible
- **AND** it MUST NOT mark the row terminal solely because observation detached.

#### Scenario: Missing backend config disables actions without rewriting truth

- **GIVEN** a SkillRunner run has `backendId`
- **WHEN** projection cannot resolve backend config
- **THEN** the task runtime UI MUST show the row as not actionable or needing
  configuration repair
- **AND** it MUST NOT recover actions from stale persisted backend connection
  fields.

Invariant anchors:

- `INV-SR-REQUESTID-ATTACH-NO-REKEY`
- `INV-SR-OBSERVER-FAILURE-NONTERMINAL`
- `INV-SR-UI-PROJECTION-DERIVED`
- `INV-SR-UI-SKILL-NAME-CASCADED`
- `INV-SR-BACKEND-CONFIG-CASCADE`
