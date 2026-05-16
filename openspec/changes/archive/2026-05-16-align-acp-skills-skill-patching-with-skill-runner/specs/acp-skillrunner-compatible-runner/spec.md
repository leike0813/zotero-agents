## MODIFIED Requirements

### Requirement: ACP runner SHALL validate structured output and repair failures

The ACP runner SHALL validate assistant turn output and issue bounded repair
prompts when validation fails.

#### Scenario: Initial Prompt Uses Run Execution Instructions

- **GIVEN** an ACP Skills run is created for a SkillRunner-compatible job
- **WHEN** the run workspace is prepared
- **THEN** ACP Skills SHALL materialize a run-level instruction file for the resolved agent family
- **AND** the first prompt SHALL invoke the requested skill using the agent-family-specific skill syntax
- **AND** the first prompt SHALL render Skill-Runner-style Inputs, Parameters, and task text
- **AND** ACP workspace paths SHALL be included only as compact run context.

#### Scenario: Repair limit reached

- **GIVEN** the output remains invalid after three repair prompts
- **WHEN** the runner finishes validation
- **THEN** the provider result SHALL fail with validation diagnostics

#### Scenario: Repair Prompt Uses Target Contract Details

- **GIVEN** an ACP Skills output candidate fails validation
- **WHEN** the runner builds a repair prompt
- **THEN** the prompt SHALL state that the previous output did not satisfy the Skill Runner output contract
- **AND** it SHALL include the previous candidate, validation errors, branch guidance, and target output contract details
- **AND** it SHALL forbid explanations and Markdown fences.
