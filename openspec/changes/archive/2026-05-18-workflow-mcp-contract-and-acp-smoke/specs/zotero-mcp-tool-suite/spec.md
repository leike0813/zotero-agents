# zotero-mcp-tool-suite

## ADDED Requirements

### Requirement: ACP required MCP tools are callable-smoked

ACP SkillRunner-compatible runs with workflow-declared required MCP tools SHALL
verify that the current ACP session exposes the required Zotero MCP callables
before sending the business skill prompt.

#### Scenario: Callable smoke succeeds

- **GIVEN** required MCP tools are declared
- **AND** host MCP availability preflight succeeds
- **WHEN** the ACP session is created or recovered
- **THEN** the runner SHALL send a smoke prompt before the business prompt
- **AND** the run SHALL continue only after each required tool reaches Zotero MCP
  as a `tools/call`.

#### Scenario: Callable smoke fails

- **GIVEN** required MCP tools are declared
- **AND** the ACP session does not expose one required callable
- **WHEN** smoke runs
- **THEN** the business prompt SHALL NOT be sent
- **AND** the run SHALL record a clear MCP callable smoke failure.

### Requirement: Required-MCP runs receive an MCP guard

ACP business prompts for required-MCP workflows SHALL include a short guard
stating that host MCP checks already ran and that agents must not search MCP
configuration or diagnose tool injection manually.

#### Scenario: Guard is injected

- **GIVEN** a required-MCP workflow
- **WHEN** the business prompt or recovered continuation prompt is sent
- **THEN** it SHALL include the MCP guard before user/skill task content.
