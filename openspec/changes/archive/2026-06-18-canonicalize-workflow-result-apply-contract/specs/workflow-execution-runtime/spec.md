## MODIFIED Requirements

### Requirement: Workflow runtime executes skillrunner sequences serially

The workflow runtime SHALL execute `skillrunner.sequence.v1` requests step by
step and SHALL not enqueue sequence steps as independent parallel workflow
jobs.

#### Scenario: Sequence handoff uses canonical result JSON

- **WHEN** an ACP or SkillRunner sequence step succeeds
- **THEN** downstream handoff SHALL use `ProviderExecutionResult.resultJson` as
  the step output
- **AND** runtime SHALL NOT infer business output from `responseJson.result`.

#### Scenario: Successful sequence step without result JSON fails closed

- **WHEN** an ACP or SkillRunner sequence step reports success without
  `ProviderExecutionResult.resultJson`
- **THEN** sequence runtime SHALL treat that as a provider contract error
- **AND** downstream steps SHALL NOT start from provider raw metadata.
