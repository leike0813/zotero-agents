## ADDED Requirements

### Requirement: SkillRunner mode is declared at skill request level

SkillRunner-compatible workflow manifests SHALL declare skill execution mode on
the job or sequence step that runs the skill.

#### Scenario: Single SkillRunner job declares mode on create

- **GIVEN** a declarative workflow request with `kind = skillrunner.job.v1`
- **WHEN** the manifest is loaded
- **THEN** `request.create.mode` SHALL be required
- **AND** the value SHALL be `auto` or `interactive`.

#### Scenario: SkillRunner sequence declares mode per step

- **GIVEN** a declarative workflow request with `kind = skillrunner.sequence.v1`
- **WHEN** the manifest is loaded
- **THEN** every `request.sequence.steps[]` entry SHALL require `mode`
- **AND** each value SHALL be `auto` or `interactive`.

#### Scenario: Workflow-level mode fields are rejected

- **GIVEN** a workflow manifest declares `execution.mode` or `execution.skillrunner_mode`
- **WHEN** the manifest is loaded
- **THEN** validation SHALL reject the manifest.
