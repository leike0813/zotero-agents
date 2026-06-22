## ADDED Requirements

### Requirement: SkillRunner observer failures SHALL preserve backend truth

SkillRunner foreground settlement SHALL NOT classify a run as terminal `failed`
solely because the frontend loses local observation through a transport,
network, disconnect, or shutdown-path error after a backend request id is known.
Only backend-confirmed terminal `failed` or `canceled` states, explicit user
cancelation, or classified nonrecoverable client contract errors SHALL write a
terminal run failure.

#### Scenario: Shutdown network failure after request creation

- **GIVEN** a SkillRunner job or sequence step has a backend request id
- **WHEN** frontend polling or result fetch fails with a local network or
  shutdown-path observer error
- **THEN** the frontend SHALL record diagnostics for the observer failure
- **AND** it SHALL NOT mark the SkillRunner run or owning sequence as terminal
  `failed` solely from that observer error.

#### Scenario: Backend terminal failure remains terminal

- **GIVEN** a SkillRunner job or sequence step has a backend request id
- **WHEN** the backend state response confirms status `failed` or `canceled`
- **THEN** the frontend SHALL settle the run with the corresponding terminal
  state
- **AND** the owning sequence SHALL stop according to normal failed or canceled
  step semantics.

#### Scenario: Recovery SSOT remains projectable run records

- **GIVEN** a local observer failure has been tolerated as recoverable
- **WHEN** startup, backend-health, or local-runtime-up recovery runs
- **THEN** recovery SHALL continue to use projectable SkillRunner run records as
  its source of truth
- **AND** recovery SHALL NOT perform backend-wide run-list scanning as a
  substitute for missing projectable run records.
