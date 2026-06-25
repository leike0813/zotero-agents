## ADDED Requirements

### Requirement: SkillRunner UI MUST separate run state from apply state

Task runtime UI SHALL render SkillRunner backend execution state and deferred
apply state as separate lifecycle fields.

#### Scenario: terminal run with pending apply stays projectable

- **WHEN** a SkillRunner run state is `succeeded`
- **AND** apply state is `pending` or `running`
- **THEN** task runtime UI SHALL keep the run in projections with a deferred
  apply indicator
- **AND** it SHALL NOT archive the run solely because backend execution is
  terminal

#### Scenario: failed apply is visible and cancellable only where meaningful

- **WHEN** a SkillRunner run state is terminal
- **AND** apply state is `failed`
- **THEN** task runtime UI SHALL show the apply error summary
- **AND** it SHALL NOT continue chat stream, pending, reply, or cancel loops for
  that terminal backend run

#### Scenario: SkillRunner request ids do not pollute ACP UI state

- **WHEN** a SkillRunner request reaches terminal or apply settlement
- **THEN** task runtime UI SHALL derive its row from SkillRunner projections
- **AND** it SHALL NOT require or create ACP `skill-runs` state for that request
