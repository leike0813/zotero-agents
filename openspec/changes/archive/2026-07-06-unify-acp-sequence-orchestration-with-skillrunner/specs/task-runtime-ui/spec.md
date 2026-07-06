## MODIFIED Requirements

### Requirement: Task runtime UI projections exclude sequence roots

Task runtime UI projections SHALL consume only projectable task rows and
concrete provider run projections. Dashboard active task, toolbar popover,
workspace attention, and Dashboard history projections SHALL NOT treat
`skillrunner.sequence.v1` root workflow jobs as projectable task rows.

#### Scenario: Dashboard active rows show ACP sequence steps only

- **GIVEN** an ACP sequence workflow has a root workflow id and one active ACP
  step run
- **WHEN** Dashboard active task rows are computed
- **THEN** the result SHALL include the concrete ACP step row
- **AND** it SHALL NOT include a row for the root workflow id.

#### Scenario: Multiple sequence steps are not deduped by workflow run id

- **GIVEN** multiple concrete ACP or SkillRunner step runs share one workflow
  run id
- **WHEN** active or history projections are built
- **THEN** each concrete step run SHALL remain independently visible according
  to its own request/run identity.

#### Scenario: Legacy sequence root rows are cleanup-only

- **GIVEN** an old taskRuntime or Dashboard history row represents a
  `skillrunner.sequence.v1` root workflow
- **WHEN** startup cleanup runs
- **THEN** the old row MAY be deleted
- **AND** it SHALL NOT be used as fallback metadata for active or history
  projection.
