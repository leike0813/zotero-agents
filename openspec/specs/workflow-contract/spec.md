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

### Requirement: Workflow manifests declare executable hooks

Workflow manifests SHALL declare workflow-owned hook modules through `hooks`.

#### Scenario: Manifest declares optional preflight hook

- **WHEN** a workflow manifest declares `hooks.preflight`
- **THEN** the loader SHALL load a module export named `preflight`
- **AND** the manifest SHALL remain invalid if the hook file or export is missing.

#### Scenario: Preflight is not a visibility hook

- **WHEN** workflow menus, debug classification, or host readiness checks evaluate workflow availability
- **THEN** they SHALL continue to use manifest selection policy and validation metadata
- **AND** they SHALL NOT execute `hooks.preflight`.

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

#### Scenario: Preflight does not affect backend compatibility

- **WHEN** a workflow declares `hooks.preflight`
- **THEN** compatible backend profile resolution SHALL still follow the top-level provider
- **AND** preflight outcomes SHALL NOT change provider/backend compatibility.

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

### Requirement: Workflow manifest declares skill-level execution mode

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

- **GIVEN** a workflow manifest declared `execution.mode` or `execution.skillrunner_mode`
- **WHEN** the manifest is loaded
- **THEN** validation SHALL reject the manifest.

### Requirement: Workflow request construction has a single request source

Provider request payloads SHALL be produced only by declarative request
compilation or `hooks.buildRequest`.

#### Scenario: Preflight context informs buildRequest

- **WHEN** preflight returns context for an input unit
- **THEN** the runtime SHALL pass that context to `buildRequest`
- **AND** `buildRequest` SHALL remain responsible for returning the provider request payload.

#### Scenario: Selection context is not mutated by preflight

- **WHEN** preflight returns context or replacement units
- **THEN** the runtime SHALL keep preflight metadata separate from `selectionContext`
- **AND** downstream hooks SHALL be able to distinguish original input facts from preflight execution plan facts.

### Requirement: Workflow parameters may be required

Workflow manifests SHALL support `parameters.<key>.required` as an optional boolean contract.

#### Scenario: Required values are present

- **WHEN** a required string is non-blank, a required number is finite, or a required boolean is either true or false
- **THEN** workflow parameter validation SHALL accept the value.

#### Scenario: Required values are missing

- **WHEN** one or more required workflow parameters are absent or blank
- **THEN** execution SHALL fail before provider dispatch
- **AND** the structured error SHALL identify every missing parameter.

#### Scenario: Required is omitted

- **WHEN** a workflow parameter does not declare `required: true`
- **THEN** the parameter SHALL retain optional behavior.

### Requirement: Workflow Host public data SHALL use a closed portable value model

Workflow Host and Broker public DTOs SHALL be composed from finite strict-JSON values and canonical portable references. The only non-JSON values permitted at the trusted in-process seam SHALL be `AbortSignal`, declared callbacks, editor DOM values, byte arrays, and trusted local path values explicitly named by the v12 contract.

#### Scenario: Portable item reference is accepted

- **WHEN** a caller supplies a positive finite `libraryId` and canonical Zotero item key
- **THEN** the contract accepts the portable item reference without requiring a numeric item ID or raw Zotero object

#### Scenario: Native object reaches a public DTO

- **WHEN** a public DTO contains a Zotero object, Window, native stream, filesystem adapter, non-finite number, or undeclared binary value
- **THEN** validation fails with a stable coded error before the value crosses the public seam

### Requirement: Workflow Host errors SHALL use one closed public taxonomy

Every Workflow Host owner SHALL expose failures through the eleven-code `zotero-agents.workflow-host-error.v1` contract with code-specific strict-JSON details. Callers MUST NOT branch on error prose, class name, stack, provider identity, or backend product name.

#### Scenario: Missing referenced object

- **WHEN** a valid portable reference resolves to no current object
- **THEN** the failure uses `not_found` with a closed target kind and no raw reference or native cause

#### Scenario: Non-interactive adapter denies UI

- **WHEN** a non-interactive adapter receives a UI-dependent call
- **THEN** the failure uses `interaction_required` and names only the closed member identity

### Requirement: Cancelable calls SHALL use a separate trusted control parameter

Potentially blocking Workflow Host calls with real cancellation points SHALL accept `WorkflowCallControl` separately from their JSON request DTO. Callback-scoped calls SHALL require the control parameter and SHALL execute callbacks serially.

#### Scenario: Caller aborts before publication

- **WHEN** the execution signal is aborted before a cancelable owner publishes a result
- **THEN** the owner does not publish a late success and reports cancellation through the contractually permitted channel

### Requirement: Contract variants SHALL retain one exact shape

Interactive and non-interactive Workflow Host variants SHALL expose the same exact top-level and nested member identities. Availability or interaction policy MUST be represented by results or coded failures, never by missing optional members, spreads, proxies, or a runtime capability catalog.

#### Scenario: Variant conformance is inspected

- **WHEN** both current contract variants are recursively inspected
- **THEN** their member identities and function positions are identical even though UI-dependent execution behavior differs

#### Scenario: Foundation is implemented before activation

- **WHEN** this foundation change is complete but final v12 activation has not run
- **THEN** the production projection still reports the current v11 identity and does not expose a partial v12 surface
