## MODIFIED Requirements

### Requirement: Workflow seams SHALL honor explicit ACP and sequence terminal facts

Terminal observation and result application SHALL inspect the canonical ACP run and sequence state even when the local provider job or promise still reports `running`. An explicit `failed` or `canceled` state SHALL produce the matching workflow outcome and SHALL prevent result application.

#### Scenario: ACP run cancels before provider promise returns

- **WHEN** the ACP run store records `canceled` while the provider promise is still pending
- **THEN** the terminal observer SHALL report canceled
- **AND** the apply seam SHALL skip result application and return a canceled outcome.

#### Scenario: Sequence child publishes ACP failure

- **WHEN** the active ACP sequence step records `failed` or `canceled`
- **THEN** the step and parent sequence SHALL synchronously enter the same terminal class
- **AND** no downstream sequence step SHALL start.

#### Scenario: ACP terminal error reaches sequence catch

- **WHEN** an ACP step throws after its canonical run record is terminal
- **THEN** sequence error handling SHALL preserve that ACP terminal classification
- **AND** it SHALL NOT classify the error as a SkillRunner observer failure.
