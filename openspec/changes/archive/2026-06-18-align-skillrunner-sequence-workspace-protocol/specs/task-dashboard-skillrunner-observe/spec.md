## MODIFIED Requirements

### Requirement: SkillRunner recoverable terminal apply MUST have a single owner

Plugin MUST ensure exactly one execution path owns terminal `applyResult` for
SkillRunner runs.

#### Scenario: SkillRunner sequence step terminal success applies only that step

- **GIVEN** a SkillRunner request belongs to a sequence step
- **WHEN** the request reaches terminal success
- **THEN** plugin SHALL execute that step's `apply_result` workflow when
  declared
- **AND** plugin SHALL NOT execute the outer sequence workflow apply for that
  step request
- **AND** plugin SHALL continue the sequence from the next step when the step
  apply succeeds or is configured to continue after apply failure

#### Scenario: SkillRunner sequence apply does not update ACP run store

- **WHEN** a SkillRunner sequence step apply succeeds or fails
- **THEN** plugin SHALL update SkillRunner task/runtime and sequence state
- **AND** plugin SHALL NOT write ACP skill run apply state for that request

### Requirement: SkillRunner stream lifecycle MUST be bounded by state and session ownership

Plugin MUST minimize long-lived stream connections.

#### Scenario: Sequence step observation uses step request identity

- **WHEN** SkillRunner sequence step requests are observed in dashboard or run
  workspace
- **THEN** each observed row SHALL be keyed by that step's backend `requestId`
- **AND** interactions SHALL target the selected step request rather than an
  outer sequence orchestration id
