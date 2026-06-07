## ADDED Requirements

### Requirement: Workflow runtime executes skillrunner sequences serially

The workflow runtime SHALL execute `skillrunner.sequence.v1` requests step by
step and SHALL not enqueue sequence steps as independent parallel workflow
jobs.

#### Scenario: Steps run in declaration order

- **WHEN** a sequence request contains multiple steps
- **THEN** the runtime SHALL launch the first step
- **AND** it SHALL launch each downstream step only after the upstream step
  returns a non-deferred successful result.

#### Scenario: Only final step applies

- **WHEN** intermediate sequence steps succeed
- **THEN** workflow `applyResult` SHALL NOT run for those intermediate steps.
- **WHEN** the declared final step succeeds
- **THEN** workflow `applyResult` SHALL run once using the final step result.

#### Scenario: A sequence step cannot continue

- **WHEN** a sequence step fails, is canceled, or returns deferred
- **THEN** the runtime SHALL NOT launch downstream steps.
