# zotero-host-access-prompt-injection Specification

## Purpose
TBD - created by archiving change unify-host-bridge-prompt-injection. Update Purpose after archive.
## Requirements
### Requirement: Workflow-declared Zotero host access

ACP skill workflows SHALL declare Zotero host access intent with `execution.zoteroHostAccess.required`.

#### Scenario: Missing declaration defaults to required

- **GIVEN** a SkillRunner-compatible workflow manifest omits `execution.zoteroHostAccess`
- **WHEN** the workflow runtime adapts the request for an ACP skill run backend
- **THEN** the request includes `runtime_options.zotero_host_access.required` set to `true`

#### Scenario: Disabled declaration propagates

- **GIVEN** a SkillRunner-compatible workflow manifest declares `execution.zoteroHostAccess.required` as `false`
- **WHEN** the workflow runtime adapts the request for an ACP skill run backend
- **THEN** the request includes `runtime_options.zotero_host_access.required` set to `false`

### Requirement: Centralized Host Bridge injection

The ACP skill runner SHALL be the only default injection point for general Zotero Host Bridge runtime materials.

#### Scenario: Required host access is materialized

- **GIVEN** an ACP skill run request has no host access runtime option
- **WHEN** the run is prepared
- **THEN** the runner materializes `.zotero-bridge/profile.json`, `.zotero-bridge/README.md`, and CLI shims
- **AND** injects Host Bridge environment variables into the backend
- **AND** includes the Host Bridge prompt snippet in the run prompt

#### Scenario: Disabled host access is not materialized

- **GIVEN** an ACP skill run request has `runtime_options.zotero_host_access.required` set to `false`
- **WHEN** the run is prepared
- **THEN** the runner does not materialize `.zotero-bridge`
- **AND** does not inject Host Bridge environment variables
- **AND** does not include the Host Bridge prompt snippet
- **AND** records a disabled host-access event

### Requirement: ACP Chat always uses Zotero host access

ACP Chat sessions SHALL always receive Zotero Host Bridge CLI injection.

#### Scenario: Chat adapter receives Host Bridge environment

- **GIVEN** an ACP Chat session is being connected
- **WHEN** the ACP adapter is created
- **THEN** `.zotero-bridge/profile.json`, `.zotero-bridge/README.md`, and available CLI shims are materialized in the chat workspace
- **AND** the adapter backend receives Host Bridge environment variables

#### Scenario: Chat prompts include Host Bridge guidance

- **GIVEN** an ACP Chat session is connected
- **WHEN** the user sends a chat prompt
- **THEN** the prompt sent to the ACP adapter includes the Host Bridge prompt snippet
- **AND** the user-visible transcript still stores the original user message

### Requirement: Engine instruction fallback

When Host Bridge prompt text is injected into the run prompt, the ACP skill runner SHALL also append the same text to the run workspace engine instruction file.

#### Scenario: Host access snippet is bounded

- **GIVEN** an ACP skill run requires Zotero host access
- **WHEN** the run execution instruction file is written
- **THEN** it contains one block bounded by `<!-- zotero-skills-zotero-host-access:start -->` and `<!-- zotero-skills-zotero-host-access:end -->`
- **AND** the block contains the same Host Bridge prompt snippet used by the run prompt

#### Scenario: Disabled host access omits bounded block

- **GIVEN** an ACP skill run disables Zotero host access
- **WHEN** the run execution instruction file is written
- **THEN** it does not contain the Zotero host access bounded block

### Requirement: Built-in skill prompt cleanup

Built-in non-submodule skill packages SHALL NOT carry default MCP host-access declarations or generic Host Bridge environment setup prose.

#### Scenario: Built-in prompts use centralized host access guidance

- **GIVEN** a built-in skill package is injected into an ACP run
- **WHEN** an agent reads `SKILL.md`, `runner.json`, references, or gate instructions
- **THEN** those files do not instruct the agent to run MCP preflight checks, rely on MCP required tool declarations, or troubleshoot generic Host Bridge injection
- **AND** workflow-specific host calls may still be described with stable `zotero-bridge` CLI commands

