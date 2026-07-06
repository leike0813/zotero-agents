## MODIFIED Requirements

### Requirement: Host Bridge exposes workflow roots and skill runs separately

Host Bridge workflow control SHALL use workflow sequence persistence as the
root source for sequence workflow status and SHALL expose only concrete ACP or
SkillRunner provider runs as skill-run handles.

#### Scenario: Active tasks return step handles only

- **GIVEN** a sequence workflow has an active concrete step run
- **WHEN** an authenticated client requests `GET /bridge/v1/tasks/active`
- **THEN** the bridge SHALL return a handle for the concrete step run
- **AND** it SHALL NOT return the root workflow id as a skill-run handle.

#### Scenario: Workflow status reads sequence root state

- **GIVEN** a workflow run id exists in workflow sequence persistence
- **WHEN** an authenticated client requests
  `GET /bridge/v1/workflows/runs/{workflowRunId}`
- **THEN** the bridge SHALL return `found = true`
- **AND** workflow state SHALL be derived from sequence root state and concrete
  step runs
- **AND** `skillRuns[]` SHALL contain concrete provider step runs, not the
  root workflow id.

#### Scenario: Skill-run operations reject workflow root ids

- **GIVEN** a client passes a sequence workflow root id as a skill-run id
- **WHEN** the client invokes reply, connect, or skill-run cancel
- **THEN** Host Bridge SHALL reject it as not found or unsupported
- **AND** workflow cancel SHALL continue to accept the root workflow id.
