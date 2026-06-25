## MODIFIED Requirements

### Requirement: ACP executes sequence steps with workflow workspace intent

The ACP execution path SHALL support workflow workspace intent for skill runs
launched by `skillrunner.sequence.v1`.

#### Scenario: SkillRunner sequence remains frontend-orchestrated

- **WHEN** a `skillrunner.sequence.v1` workflow targets a SkillRunner backend
- **THEN** plugin SHALL launch one ordinary SkillRunner job request per step
- **AND** the SkillRunner backend SHALL NOT be treated as owning a native
  multi-step sequence run

#### Scenario: SkillRunner sequence step apply is not foreground-owned

- **WHEN** a SkillRunner sequence step reaches backend terminal success
- **THEN** foreground sequence runtime SHALL NOT execute that step's
  `apply_result`
- **AND** foreground sequence runtime SHALL preserve the step request context so
  the SkillRunner reconciler can own terminal apply

#### Scenario: ACP sequence step apply remains foreground-owned

- **WHEN** a `skillrunner.sequence.v1` workflow targets an ACP backend
- **THEN** sequence runtime MAY execute declared step `apply_result` in the
  foreground ACP path
- **AND** ACP apply state SHALL be written only for ACP skill-run request ids

## ADDED Requirements

### Requirement: SkillRunner sequence terminal apply MUST be reconciler-owned

SkillRunner sequence steps MUST use the same terminal apply ownership model as
ordinary SkillRunner auto jobs.

#### Scenario: Reconciler applies terminal SkillRunner sequence step

- **GIVEN** a SkillRunner sequence step request is tracked by recoverable context
- **WHEN** the backend reports terminal success for that request
- **THEN** the SkillRunner reconciler SHALL fetch the terminal result material
- **AND** SHALL resolve the step result JSON from the SkillRunner result
  namespace
- **AND** SHALL execute the step's declared `apply_result` workflow before
  continuing to the next step
