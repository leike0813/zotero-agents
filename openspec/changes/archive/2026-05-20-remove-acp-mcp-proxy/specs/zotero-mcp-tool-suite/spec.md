## REMOVED Requirements

### Requirement: MCP callable smoke failures are diagnosable across backends

ACP SkillRunner-compatible runs with required MCP tools SHALL persist a
backend-agnostic diagnostic bundle when callable smoke fails.

#### Scenario: Smoke failure records context injection diagnostics

- **GIVEN** a workflow declares required Zotero MCP tools
- **AND** host MCP availability preflight succeeds
- **WHEN** callable smoke fails
- **THEN** the run SHALL record a diagnostic classification
- **AND** the run SHALL persist a redacted diagnostic JSON file
- **AND** the run SHALL persist a backend evidence log.

#### Scenario: Backend-specific evidence remains optional

- **GIVEN** a backend does not provide Claude Code debug files
- **WHEN** callable smoke fails
- **THEN** the diagnostic bundle SHALL still be generated from backend-neutral host evidence.

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
- **THEN** the prompt SHALL state that the agent must not search MCP config, read project files, use shell commands, guess tool names, initialize runtime DB, or execute skill steps.

### Requirement: ACP required MCP tools are callable-smoked

ACP SkillRunner-compatible runs with workflow-declared required MCP tools SHALL
verify that the current ACP session exposes the required Zotero MCP callables
before sending the business skill prompt.

#### Scenario: Callable smoke succeeds

- **GIVEN** required MCP tools are declared
- **AND** host MCP availability preflight succeeds
- **WHEN** the ACP session is created or recovered
- **THEN** the runner SHALL send a smoke prompt before the business prompt
- **AND** the run SHALL continue only after each required tool reaches Zotero MCP as a `tools/call`.

#### Scenario: Callable smoke fails

- **GIVEN** required MCP tools are declared
- **AND** the ACP session does not expose one required callable
- **WHEN** smoke runs
- **THEN** the business prompt SHALL NOT be sent
- **AND** the run SHALL record a clear MCP callable smoke failure.

## MODIFIED Requirements

### Requirement: ACP runtime prompts are packaged separately from skill patch templates

ACP required-MCP guard prompt bodies SHALL be loaded from ACP runtime prompt
template assets, not hardcoded in orchestration business logic and not mixed
with ACP skill patch templates.

#### Scenario: Required MCP guard is rendered from runtime templates

- **GIVEN** a workflow declares required MCP tools
- **WHEN** the ACP runner sends the business skill prompt after preflight
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
- **THEN** the required-MCP guard and recovered continuation guard templates SHALL be written in English.

### Requirement: Required-MCP runs receive an MCP guard

ACP business prompts for required-MCP workflows SHALL include a short guard
stating that host MCP preflight checks already ran and that agents must not
search MCP configuration or diagnose tool injection manually.

#### Scenario: Guard is injected

- **GIVEN** a required-MCP workflow
- **WHEN** the business prompt or recovered continuation prompt is sent
- **THEN** it SHALL include the MCP guard before user/skill task content.

### Requirement: ACP required MCP tools are preflighted before prompting

The ACP SkillRunner-compatible runner SHALL preflight runner-declared MCP tools
before sending the first prompt to an ACP agent. This preflight SHALL be the
only blocking host-side MCP readiness gate; the runner SHALL NOT send a separate
callable-smoke prompt.

#### Scenario: HTTP MCP is unavailable

- **GIVEN** a skill runner manifest declares `mcp.required_tools`
- **AND** the ACP backend does not advertise HTTP MCP support
- **WHEN** the ACP skill run starts
- **THEN** the run SHALL fail before `newSession` or `prompt`
- **AND** the failure SHALL list the required MCP tools.

#### Scenario: Required tool is missing

- **GIVEN** a skill runner manifest declares `mcp.required_tools`
- **AND** the embedded Zotero MCP tool registry does not contain one required tool
- **WHEN** the ACP skill run starts
- **THEN** the run SHALL fail before the first prompt
- **AND** the error SHALL name the missing tool.

#### Scenario: Required tools pass preflight

- **GIVEN** a skill runner manifest declares `mcp.required_tools`
- **AND** the ACP backend advertises HTTP MCP support
- **AND** the embedded Zotero MCP registry contains every required tool
- **WHEN** the ACP session is created or recovered
- **THEN** the runner SHALL send the guarded business prompt directly
- **AND** it SHALL NOT send a separate callable-smoke prompt.
