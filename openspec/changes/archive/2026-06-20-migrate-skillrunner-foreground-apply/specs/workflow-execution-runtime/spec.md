## ADDED Requirements

### Requirement: SkillRunner sequences use foreground step orchestration

`skillrunner.sequence.v1` normal execution SHALL be orchestrated by the
frontend step loop instead of active reconciler settlement.

#### Scenario: Successful step continues downstream

- **WHEN** a SkillRunner sequence step reaches terminal success
- **THEN** the foreground runtime SHALL fetch its output
- **AND** run any declared step apply hook
- **AND** build the handoff used by the next step.

#### Scenario: Waiting step detaches the sequence

- **WHEN** a SkillRunner sequence step reaches `waiting_user` or `waiting_auth`
- **THEN** the sequence SHALL enter `waiting_interaction` with pending step
  metadata
- **AND** reply/auth continuation SHALL resume from that step.

#### Scenario: Failed step stops the sequence

- **WHEN** a SkillRunner sequence step reaches `failed` or `canceled`
- **THEN** the sequence SHALL stop
- **AND** downstream steps SHALL NOT be submitted.
