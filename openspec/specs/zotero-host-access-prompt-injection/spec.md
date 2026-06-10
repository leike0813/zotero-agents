# zotero-host-access-wrapper-guidance Specification

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

The ACP skill runner SHALL be the only default injection point for general
Zotero Host Bridge runtime materials. Agent-facing Host Bridge guidance SHALL be
provided by the built-in `zotero-bridge-cli` wrapper skill.

#### Scenario: Required host access is materialized

- **GIVEN** an ACP skill run request has no host access runtime option
- **WHEN** the run is prepared
- **THEN** the runner materializes `.zotero-bridge/profile.json`, `.zotero-bridge/README.md`, and CLI shims
- **AND** injects Host Bridge environment variables into the backend
- **AND** exposes the `zotero-bridge-cli` wrapper skill through the shared
  catalog or run-local skill roots

#### Scenario: Disabled host access is not materialized

- **GIVEN** an ACP skill run request has `runtime_options.zotero_host_access.required` set to `false`
- **WHEN** the run is prepared
- **THEN** the runner does not materialize `.zotero-bridge`
- **AND** does not inject Host Bridge environment variables
- **AND** records a disabled host-access event

### Requirement: ACP Chat always uses Zotero host access

ACP Chat sessions SHALL always receive Zotero Host Bridge CLI injection.

#### Scenario: Chat adapter receives Host Bridge environment

- **GIVEN** an ACP Chat session is being connected
- **WHEN** the ACP adapter is created
- **THEN** `.zotero-bridge/profile.json`, `.zotero-bridge/README.md`, and available CLI shims are materialized in the chat workspace
- **AND** the adapter backend receives Host Bridge environment variables.

#### Scenario: Chat materializes Host Bridge wrapper skill

- **GIVEN** an ACP Chat session is connected
- **WHEN** the backend supports project skill roots
- **THEN** the chat workspace receives the `zotero-bridge-cli` wrapper skill in
  those roots
- **AND** prompts sent to the ACP adapter still contain only the original user
  message.

### Requirement: Engine instructions do not duplicate Host Bridge guidance

Host Bridge command guidance SHALL not be appended to engine instruction files.

#### Scenario: Host access snippet is absent

- **GIVEN** an ACP skill run requires Zotero host access
- **WHEN** the run execution instruction file is written
- **THEN** it does not contain an injected Host Bridge command guidance block
- **AND** the `zotero-bridge-cli` wrapper skill remains the source of Host
  Bridge command guidance

#### Scenario: Disabled host access omits wrapper guidance

- **GIVEN** an ACP skill run disables Zotero host access
- **WHEN** the run execution instruction file is written
- **THEN** it does not contain Host Bridge command guidance.

### Requirement: Built-in skill prompt cleanup

Built-in non-submodule skill packages SHALL NOT carry default MCP host-access declarations or generic Host Bridge environment setup prose.

#### Scenario: Built-in prompts use centralized host access guidance

- **GIVEN** a built-in skill package is injected into an ACP run
- **WHEN** an agent reads `SKILL.md`, `runner.json`, references, or gate instructions
- **THEN** those files do not instruct the agent to run MCP preflight checks, rely on MCP required tool declarations, or troubleshoot generic Host Bridge injection
- **AND** workflow-specific host calls may still be described with stable `zotero-bridge` CLI commands
