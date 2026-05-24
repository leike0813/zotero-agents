# workflow-contract Specification

## Purpose
TBD - created by archiving change workflow-mcp-contract-and-acp-smoke. Update Purpose after archive.
## Requirements
### Requirement: Workflows declare required MCP tools

Workflow implementations SHALL support `execution.mcp.requiredTools` as an
optional Zotero MCP tool declaration. These declarations SHALL be carried into
ACP skill run requests for orchestration.

#### Scenario: Required MCP tools are exposed to ACP orchestration

- **GIVEN** a workflow declares `execution.mcp.requiredTools`
- **WHEN** the workflow request is compiled for an ACP skill run
- **THEN** the ACP request SHALL include the required tool names in runtime
  options for the ACP orchestrator.

### Requirement: Workflow parameters may declare dynamic option sources

Workflow manifests SHALL support `parameters.<key>.optionsSource` for string
parameters that request host-resolved option candidates.

#### Scenario: Manifest declares collection options

- **WHEN** a workflow parameter declares `optionsSource.kind` as
  `zotero.collections`
- **THEN** the manifest SHALL load successfully
- **AND** the parameter SHALL remain a string parameter.

#### Scenario: Source kind is unknown

- **WHEN** a workflow parameter declares an unknown `optionsSource.kind`
- **THEN** the manifest SHALL still load
- **AND** option resolution SHALL report a recoverable diagnostic instead of
  failing the workflow.

### Requirement: Dynamic options separate label from submitted value

Resolved dynamic options SHALL expose a submitted `value` and a user-visible
`label`.

#### Scenario: Zotero collection option is rendered

- **WHEN** the dynamic source returns a Zotero collection
- **THEN** the submitted value SHALL be a stable collection ref
- **AND** the visible label SHALL be the collection path, not the raw
  collection key.

### Requirement: Workflow provider determines compatible backend types

Workflow execution MUST derive compatible backend profile types from top-level
`provider` only. `request.kind` MUST describe request protocol/shape and MUST
NOT infer backend compatibility.

#### Scenario: ACP provider excludes SkillRunner backend

- **GIVEN** a workflow declares `provider: "acp"`
- **AND** the workflow request kind is `skillrunner.job.v1`
- **WHEN** backend profiles are listed or resolved for the workflow
- **THEN** only ACP backend profiles SHALL be considered compatible
- **AND** SkillRunner backend profiles SHALL NOT be listed or selected.

#### Scenario: SkillRunner provider permits ACP bridge

- **GIVEN** a workflow declares `provider: "skillrunner"`
- **WHEN** backend profiles are listed or resolved for the workflow
- **THEN** SkillRunner backend profiles SHALL be compatible
- **AND** ACP backend profiles SHALL also be compatible as the local
  SkillRunner-compatible ACP bridge.

#### Scenario: Other providers match backend type directly

- **GIVEN** a workflow declares any provider other than `acp` or `skillrunner`
- **WHEN** backend profiles are listed or resolved for the workflow
- **THEN** only backend profiles whose type equals the provider SHALL be
  compatible.

#### Scenario: Request kind is not a backend compatibility source

- **GIVEN** two workflows with the same `request.kind`
- **AND** the workflows declare different providers
- **WHEN** compatible backend profiles are resolved
- **THEN** backend compatibility SHALL follow each workflow's provider
- **AND** SHALL NOT be inferred from the shared request kind.

#### Scenario: Missing provider is invalid for execution

- **GIVEN** a workflow manifest has no top-level provider
- **WHEN** backend profiles are listed or resolved for execution
- **THEN** the runtime SHALL report a deterministic missing-provider error
- **AND** it SHALL NOT infer a backend type from `request.kind`.

### Requirement: ZoteroHostAccess runtime options are ACP-only until SkillRunner supports them

Workflow request preparation SHALL convert the run-level write auto-approval
option into `runtime_options.zotero_host_access.auto_approve_writes` for ACP
skill run requests and SHALL NOT pass the option as a skill parameter.

While `SKILLRUNNER_SUPPORTS_ZOTERO_HOST_ACCESS_RUNTIME_OPTIONS` is false,
SkillRunner-bound requests SHALL NOT include
`runtime_options.zotero_host_access`.

#### Scenario: User enables write auto-approval

- **WHEN** the workflow declares bypass support and the user enables the setting
- **THEN** the ACP skill run request SHALL include
  `zotero_host_access.auto_approve_writes: true`.

#### Scenario: SkillRunner backend is selected while ZoteroHostAccess is required

- **WHEN** the final backend is SkillRunner and the workflow explicitly declares
  `execution.zoteroHostAccess.required: true`
- **THEN** the SkillRunner request SHALL omit `zotero_host_access`.
- **AND** the runtime log SHALL include
  `skillrunner_zotero_host_access_runtime_option_stripped`.
- **AND** backend/provider compatibility SHALL otherwise remain unchanged.

