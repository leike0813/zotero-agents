# zotero-mcp-tool-suite

## ADDED Requirements

### Requirement: ACP callable smoke has a hard timeout

ACP SkillRunner-compatible runs with workflow-declared required MCP tools SHALL
bound callable smoke with a hard timeout before sending any business skill
prompt.

#### Scenario: Smoke times out

- **GIVEN** a workflow declares required MCP tools
- **AND** host MCP availability preflight succeeds
- **WHEN** ACP callable smoke does not complete before the timeout
- **THEN** the business prompt SHALL NOT be sent
- **AND** the run SHALL fail with a clear MCP callable smoke timeout error.

### Requirement: Smoke prompt forbids alternate tool-access attempts

The callable smoke prompt SHALL instruct the agent to use only the declared MCP
callables for the smoke and SHALL forbid shell/config/file searches or alternate
bridges during smoke.

#### Scenario: Smoke prompt is bounded to callable exposure

- **WHEN** the ACP runner sends a callable smoke prompt
- **THEN** the prompt SHALL state that the agent must not search MCP config,
  read project files, use shell commands, guess tool names, initialize runtime
  DB, or execute skill steps.

### Requirement: ACP runtime prompts are packaged separately from skill patch templates

ACP MCP smoke and required-MCP guard prompt bodies SHALL be loaded from ACP
runtime prompt template assets, not hardcoded in orchestration business logic and
not mixed with ACP skill patch templates.

#### Scenario: Runtime smoke prompt is rendered from runtime templates

- **GIVEN** the ACP runner needs to send a callable smoke prompt
- **WHEN** it builds the smoke message
- **THEN** it SHALL load the `mcp_callable_smoke` ACP runtime prompt template
- **AND** render declared required tools and timeout values into that template
- **AND** the template SHALL reside outside `addon/content/acp-skill-patches/templates`.

#### Scenario: Required MCP guard is rendered from runtime templates

- **GIVEN** a workflow declares required MCP tools
- **WHEN** the ACP runner sends the business skill prompt after smoke
- **THEN** it SHALL prepend the `mcp_required_guard` ACP runtime prompt template
- **AND** the template SHALL reside outside `addon/content/acp-skill-patches/templates`.

#### Scenario: Recovered continuation guard is rendered from runtime templates

- **GIVEN** the ACP runner recovers a previous ACP Skill run session
- **WHEN** it sends a continuation prompt
- **THEN** it SHALL render the `recovered_continuation_guard` ACP runtime prompt template
- **AND** the template SHALL reside outside `addon/content/acp-skill-patches/templates`.

### Requirement: ACP runtime prompt templates use English wording

ACP runtime orchestration prompt templates SHALL use English wording to stay
consistent with the rest of the ACP execution prompt surface.

#### Scenario: Runtime prompt family stays language-consistent

- **WHEN** ACP runtime prompt templates are packaged
- **THEN** the MCP smoke, required-MCP guard, and recovered continuation guard
  templates SHALL be written in English.
