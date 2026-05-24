## MODIFIED Requirements

### Requirement: ACP backend SHALL execute SkillRunner-compatible workflow jobs

The system SHALL allow `skillrunner.job.v1` workflow requests to execute through
an ACP backend without changing the workflow-facing request contract, when the
workflow's provider-derived backend compatibility allows an ACP backend.
`request.kind` alone SHALL NOT make ACP or SkillRunner backends compatible.

#### Scenario: ACP backend dispatches skillrunner job

- **GIVEN** a workflow-compatible backend with `type: "acp"`
- **AND** a request with `kind: "skillrunner.job.v1"`
- **AND** the workflow provider permits ACP backend execution
- **WHEN** provider dispatch resolves the request
- **THEN** it SHALL route to the ACP provider workflow runner path
- **AND** ACP chat `acp.prompt.v1` behavior SHALL remain unchanged

#### Scenario: Request kind alone does not permit ACP bridge

- **GIVEN** a workflow request with `kind: "skillrunner.job.v1"`
- **AND** the workflow provider does not permit ACP backend execution
- **WHEN** backend compatibility is resolved
- **THEN** ACP backend profiles SHALL NOT be considered compatible solely
  because of the request kind.
