## ADDED Requirements

### Requirement: ACP startup preambles are template-backed

ACP Chat and ACP Skills SHALL render startup preambles from packaged runtime
prompt templates rather than hard-coded prompt strings.

#### Scenario: Runtime prompt templates are packaged

- **WHEN** runtime prompt templates are enumerated
- **THEN** ACP Chat and ACP Skills startup preamble templates SHALL be present
- **AND** each template SHALL render with the runtime placeholders required by
  the preamble helper.

### Requirement: ACP Chat injects the preamble on the first prompt only

ACP Chat SHALL prepend its startup preamble to the first prompt turn of an empty
conversation.

#### Scenario: Empty ACP Chat conversation sends first prompt

- **GIVEN** an ACP Chat conversation has no transcript items before the user
  prompt
- **WHEN** the prompt is sent to the ACP backend
- **THEN** the sent prompt text SHALL include the ACP Chat startup preamble
- **AND** it SHALL include the user's original message.

#### Scenario: Existing ACP Chat conversation sends another prompt

- **GIVEN** an ACP Chat conversation already has transcript items
- **WHEN** another prompt is sent to the ACP backend
- **THEN** the startup preamble SHALL NOT be prepended again.

### Requirement: ACP Skills injects the preamble on the initial run prompt only

ACP Skills SHALL prepend its startup preamble to the initial run prompt and keep
repair, continuation, and user reply prompts focused on their existing runtime
contracts.

#### Scenario: ACP Skills starts a run

- **WHEN** ACP Skills builds the initial run prompt
- **THEN** the sent prompt text SHALL include the ACP Skills startup preamble
- **AND** it SHALL preserve the runner entrypoint prompt and run context.

#### Scenario: ACP Skills sends a repair or recovered continuation prompt

- **WHEN** ACP Skills builds a repair prompt or recovered continuation prompt
- **THEN** the startup preamble SHALL NOT be prepended.
