## ADDED Requirements

### Requirement: ACP SkillRunner-compatible local backend cleanup SHALL account for wrapper process trees

ACP SkillRunner-compatible runs SHALL close plugin-managed local ACP backend
transports using the cached platform process-control strategy when those
backends are launched for SkillRunner-compatible runs.

#### Scenario: Wrapper-prone backend close records cleanup strategy

- **GIVEN** an ACP SkillRunner-compatible run launches a backend through a
  wrapper-prone command such as `uv`, `npx`, or a shell wrapper
- **WHEN** the run disconnects or shuts down the local transport
- **THEN** the transport lifecycle SHALL record whether process tree cleanup is
  supported and which cleanup strategy was used
- **AND** unsupported process tree cleanup SHALL be visible as a structured
  lifecycle diagnostic rather than a silent successful cleanup.

#### Scenario: Launch plan remains command source of truth

- **WHEN** process-control cleanup is enabled for an ACP backend
- **THEN** command resolution, Windows shim handling, node-direct npx handling,
  environment overlays, and command labels SHALL still come from the existing
  runtime launch plan
- **AND** process-control logic SHALL NOT re-resolve or rewrite backend command
  semantics.

#### Scenario: ACP stdout remains single-owner

- **WHEN** process-control metadata is needed for cleanup
- **THEN** it SHALL be collected through side-channel metadata or cached
  snapshot state
- **AND** it SHALL NOT write PID, ready, probe, or diagnostic content to the
  child stdout stream consumed by the ACP protocol reader.
