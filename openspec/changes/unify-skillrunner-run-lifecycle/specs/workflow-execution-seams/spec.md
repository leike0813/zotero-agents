## ADDED Requirements

### Requirement: SkillRunner run seam MUST be shared by single jobs and sequence steps

Workflow execution MUST route single SkillRunner jobs and sequence SkillRunner steps through the same SkillRunner run lifecycle seam.

#### Scenario: Single job creates run before provider request

- **GIVEN** workflow execution is about to submit a single SkillRunner job
- **WHEN** execution enters the SkillRunner seam
- **THEN** the seam MUST create a `SkillRunnerRunRecord` with stable `runKey`
  before backend request creation.

#### Scenario: Sequence step creates run before provider request

- **GIVEN** sequence orchestration is about to submit a SkillRunner step
- **WHEN** execution enters the SkillRunner seam
- **THEN** the seam MUST create a `SkillRunnerRunRecord` with stable `runKey`
  before backend request creation
- **AND** it MUST attach sequence association fields to the run record.

#### Scenario: Request progress uses runKey

- **GIVEN** provider progress references a SkillRunner execution
- **WHEN** workflow execution records the progress
- **THEN** it MUST update the run identified by `runKey`
- **AND** it MUST NOT re-key lifecycle state around `requestId`.

### Requirement: Sequence runtime MUST orchestrate without owning SkillRunner lifecycle truth

The sequence runtime MUST maintain sequence order and aggregate sequence state only; per-step SkillRunner lifecycle truth remains in the SkillRunner run store.

#### Scenario: Sequence state reads step run status

- **GIVEN** a sequence workflow contains SkillRunner steps
- **WHEN** the sequence runtime computes current orchestration state
- **THEN** it MUST read each step execution state from the SkillRunner run
  lifecycle projection
- **AND** it MUST NOT infer terminal step state from a synthetic job record.

#### Scenario: Observer detachment does not terminalize sequence

- **GIVEN** a sequence SkillRunner step has `requestId`
- **WHEN** local observation detaches after a network, abort, shutdown, or
  timeout error
- **THEN** the sequence runtime MUST keep the sequence recoverable
- **AND** it MUST NOT mark the step or sequence terminal solely from that
  observer failure.

### Requirement: SkillRunner run model MUST persist only lifecycle recovery execution facts

Workflow seams MUST avoid persisting display and registry-derived fields in the SkillRunner run record.

#### Scenario: Registry facts are resolved outside the run record

- **GIVEN** a SkillRunner run references `backendId`, `workflowId`, and
  optional `skillId`
- **WHEN** workflow execution persists the run
- **THEN** it MUST persist those identifiers
- **AND** it MUST NOT persist `backendBaseUrl`, `backendType`, `providerId`,
  `workflowLabel`, `skillName`, or `skillLabel` as lifecycle facts.

#### Scenario: Sequence display facts stay in sequence state

- **GIVEN** a SkillRunner run belongs to a sequence workflow
- **WHEN** workflow execution persists the run
- **THEN** it MUST persist sequence association ids when present
- **AND** it MUST NOT persist `sequenceStepIndex` or `sequenceFinalStepId` as
  run lifecycle facts.
