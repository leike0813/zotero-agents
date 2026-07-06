## MODIFIED Requirements

### Requirement: Workflow runtime executes skillrunner sequences serially

The workflow runtime SHALL execute `skillrunner.sequence.v1` requests step by
step and SHALL keep the sequence root in provider-neutral orchestration state,
not in ACP or SkillRunner provider run stores.

#### Scenario: Sequence root persists in workflow orchestration store

- **GIVEN** a `skillrunner.sequence.v1` workflow is initialized
- **WHEN** `SequenceRunState` is persisted
- **THEN** the state SHALL be written to workflow sequence persistence
- **AND** ACP and SkillRunner provider run stores SHALL NOT receive the
  sequence root entry.

#### Scenario: Legacy provider sequence root entries are migrated

- **GIVEN** a persisted ACP or SkillRunner provider run entry contains
  `schema = "workflow.sequence.state.v2"` or a `sequence:<workflowRunId>` run key
- **WHEN** sequence state storage is hydrated
- **THEN** the parsed state SHALL be inserted into workflow sequence persistence
- **AND** the legacy provider run entry SHALL be deleted
- **AND** later sequence reads SHALL NOT fall back to provider run tables.

#### Scenario: Sequence steps keep concrete provider identity

- **WHEN** a sequence step is executed through ACP or SkillRunner
- **THEN** the concrete provider run SHALL use the workflow run id as `runId`
- **AND** it SHALL use `<sequenceJobId>:<sequenceStepId>` as `jobId`
- **AND** it SHALL carry `sequenceStepId`, `sequenceStepIndex`, and
  `sequenceFinalStepId` when known.
