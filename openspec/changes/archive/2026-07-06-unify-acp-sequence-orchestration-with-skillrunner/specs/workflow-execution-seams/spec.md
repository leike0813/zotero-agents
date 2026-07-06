## MODIFIED Requirements

### Requirement: Workflow execution seam SHALL project only concrete task runs

The workflow execution seam SHALL treat `skillrunner.sequence.v1` root jobs as
orchestration carriers and SHALL NOT project them into taskRuntime, Dashboard
history, ACP Skills run records, SkillRunner run projections, or Host Bridge
skill-run handles.

#### Scenario: ACP sequence root is not projected

- **GIVEN** a `skillrunner.sequence.v1` workflow runs on an ACP backend
- **WHEN** the root workflow job changes state
- **THEN** the seam SHALL NOT call taskRuntime or Dashboard history writers for
  that root job.

#### Scenario: SkillRunner sequence root remains non-projectable

- **GIVEN** a `skillrunner.sequence.v1` workflow runs on a SkillRunner backend
- **WHEN** the root workflow job changes state
- **THEN** the seam SHALL preserve the existing behavior where only concrete
  SkillRunner step runs are projected.

#### Scenario: Task writers reject sequence roots

- **GIVEN** any caller attempts to write a `skillrunner.sequence.v1` root job to
  taskRuntime or Dashboard history
- **WHEN** the write helper evaluates the job
- **THEN** the helper SHALL return no row and SHALL NOT mutate taskRuntime or
  Dashboard history.
