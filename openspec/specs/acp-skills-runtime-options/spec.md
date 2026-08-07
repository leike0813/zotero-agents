# acp-skills-runtime-options Specification

## Purpose
TBD - created by archiving change govern-acp-skills-runtime-options. Update Purpose after archive.
## Requirements
### Requirement: ACP Skills runtime selections SHALL belong to the active catalogs

ACP Skills SHALL validate submitted, persisted, session-reconciled, and runtime-edited mode, provider, display model, raw model, and reasoning selections against the selected backend or live session catalogs before persistence or transport. Legal explicit selections SHALL beat a different observed current; illegal selections SHALL use a legal observed current or remain unset. Catalog order alone SHALL NOT create a current selection. A model identifier SHALL be interpreted within its `acpModelProvider` group, and the canonical selection tuple SHALL remain distinct from the existing flat provider-options wire representation.

#### Scenario: Old backend mode reaches a new backend

- **GIVEN** backend A selected `code`
- **AND** backend B exposes only `ask` and `build` with current `build`
- **WHEN** a run is submitted to backend B without editing mode
- **THEN** the run and mode setter use `build`
- **AND** `code` is never persisted or transported for backend B.

#### Scenario: Live catalog differs from submission cache

- **WHEN** a submitted selection is absent from the new session catalog
- **THEN** ACP Skills atomically replaces it with the legal observed current or clears it
- **AND** no invalid setter call is attempted.

#### Scenario: Runtime action names an unknown option

- **WHEN** a run-scoped mode, provider, model, or reasoning action names a value outside its live catalog
- **THEN** the action is rejected before transport
- **AND** the persisted run-effective selection remains unchanged.

#### Scenario: Provider-qualified model is validated in its provider group

- **WHEN** an ACP selection names `acpModelProvider` and `acpModelId`
- **THEN** validation checks membership in that provider's model group and derives the provider-qualified raw model id
- **AND** a valid tuple is applied without a `could_not_be_applied` result caused by comparing it to a bare model id.

### Requirement: ACP model catalogs SHALL preserve provider grouping in disclosure

ACP Chat and ACP Skills SHALL disclose `acpModelId` choices grouped by their corresponding `acpModelProvider`. A projection SHALL NOT present models from one default provider as a global model list when multiple providers are available, and SHALL include models observed in the current consistent catalog.

#### Scenario: Multiple ACP providers are available

- **WHEN** a backend catalog contains multiple model providers
- **THEN** the profile descriptor exposes each provider and its own model choices
- **AND** a model cannot be selected without its provider context.

#### Scenario: Current catalog contains a GUI-visible model

- **WHEN** the backend catalog includes a model such as `qwen3.7-plus`
- **THEN** describe and validate expose it under the correct provider group
- **AND** the CLI and Host projections do not reject it solely because an older cache omitted it.

### Requirement: ACP catalog readiness SHALL be shared across discovery and execution

ACP probes, profile describe/validate, GUI settings, and workflow execution SHALL use one catalog readiness projection containing source, revision, refreshedAt, state, and consistency diagnostics. Missing, stale, empty, or contradictory catalog data SHALL be non-ready until a successful refresh replaces it.

#### Scenario: Stale cache is not execution-ready

- **WHEN** an ACP runtime cache is stale or its launch/session revision changed
- **THEN** discovery marks it non-ready and identifies refresh as the recovery
- **AND** workflow execution fails before the first prompt rather than using stale selections.

#### Scenario: Refresh and GUI use the same projection

- **WHEN** a backend refresh succeeds
- **THEN** CLI describe, Host workflow validation, and GUI model/provider controls expose the same provider groups, model ids, reasoning values, and readiness metadata
- **AND** no surface invents a separate default-provider model list.

### Requirement: ACP Backend Connection Test


ACP Skills MUST require an ACP backend connection test to pass before workflow execution can use that backend.

#### Scenario: Untested Backend

Given an ACP backend has no passing connection test
When a workflow attempts to execute through ACP Skills
Then submission MUST fail with an actionable configuration error.

#### Scenario: Stale Backend

Given an ACP backend had passed connection test metadata
And the ACP launch configuration changes
When a workflow attempts to execute through ACP Skills
Then the backend MUST be treated as stale until the connection test is run again.
### Requirement: Runtime Option Cache


ACP connection tests MUST cache supported modes, models, and derived reasoning
effort choices from ACP session configuration state.

#### Scenario: Successful probe from config options

- **WHEN** an ACP backend probe succeeds and `session/new` returns select
  `configOptions` for mode, model, or thought level
- **THEN** the backend MUST persist a passing connection test and runtime
  options cache derived from those config options
- **AND** old `modes` / `models` fields MUST remain supported when config
  options are absent.

#### Scenario: Empty or failed refresh preserves existing cache

- **GIVEN** an ACP backend already has a non-empty runtime options cache
- **WHEN** a refresh fails or returns no selectable mode/model data
- **THEN** the backend MUST NOT replace the existing runtime options cache with
  an empty or missing cache.
### Requirement: Workflow Submission Options


ACP Skills workflow submission MUST expose cached mode, model, and reasoning
options for selected ACP backends, regardless of whether the cache originated
from ACP `configOptions` or legacy `modes` / `models`. ACP workflow submission
MUST also expose a positive integer Job Timeout option that maps to
`runtime_options.hard_timeout_seconds`, uses the shared provider option schema,
and shows a localized placeholder explaining that an empty value uses the
effective default, which is 20 minutes only when the skill declares no default.
Submit-time provider runtime options are execution-context overrides:
when present, they take precedence over same-named runtime option values already
compiled into the request payload.

#### Scenario: Config option cache drives settings controls

- **GIVEN** a selected ACP backend has cached runtime options derived from
  `configOptions`
- **WHEN** the workflow submit dialog is rendered
- **THEN** the dialog MUST show mode, model, and reasoning controls from the
  cache.

#### Scenario: ACP provider exposes Job Timeout option

- **WHEN** ACP provider runtime options are described
- **THEN** the schema SHALL include `hard_timeout_seconds`
- **AND** the option title SHALL be `Job Timeout (sec)`
- **AND** the option placeholder SHALL indicate that empty input uses the
  effective default and that the fallback is 20 minutes when the skill declares
  no default.

#### Scenario: ACP provider normalizes Job Timeout

- **WHEN** ACP provider runtime options are normalized
- **THEN** a positive integer `hard_timeout_seconds` value SHALL be preserved
- **AND** non-positive or non-numeric values SHALL be omitted.

#### Scenario: Submit-time Job Timeout overrides request payload

- **GIVEN** a workflow request payload already contains
  `runtime_options.hard_timeout_seconds`
- **AND** the submit-time provider options contain a positive integer
  `hard_timeout_seconds`
- **WHEN** ACP workflow execution prepares the effective request/runtime options
- **THEN** the submit-time provider option value SHALL take precedence.

#### Scenario: Workflow option surfaces reuse provider schema placeholder

- **GIVEN** an ACP backend is selected for workflow execution
- **WHEN** workflow options or the workflow submit dialog render provider
  runtime options
- **THEN** the Job Timeout input SHALL be rendered from the provider option
  schema
- **AND** it SHALL show the localized default-timeout placeholder
- **AND** no ACP-specific UI branch SHALL be required to show that field.
### Requirement: Run-Effective Runtime Options

ACP Skills SHALL persist each run's effective mode, model, raw model, and reasoning selection in the run record. The persisted run selection SHALL be the sole current-value source used by execution, recovery, and UI projection.

#### Scenario: Submitted selection survives a different handshake default

- **GIVEN** a workflow is submitted with model B
- **AND** the backend cache or new session reports model A as its current default
- **WHEN** the runner creates the session and sends the first prompt
- **THEN** it SHALL apply and execute model B
- **AND** the persisted run and composer SHALL display model B.

#### Scenario: Real observed current initializes an absent selection

- **GIVEN** a newly created run has no submitted selection for a runtime category
- **WHEN** the session handshake reports a real current value for that category
- **THEN** ACP Skills SHALL initialize that absent run field from the observed current value
- **AND** later execution and UI projection SHALL read the initialized run field.

#### Scenario: Catalog order does not invent a current selection

- **GIVEN** a run has no selection for a runtime category
- **AND** its catalog contains choices but exposes no real current value
- **WHEN** ACP Skills projects the run
- **THEN** the run SHALL remain unselected or Default for that category
- **AND** ACP Skills SHALL NOT select the first catalog choice as current.

#### Scenario: Successful run-scoped edit changes the effective selection

- **GIVEN** a waiting run currently uses model B
- **WHEN** the user changes the model to C and the remote setter succeeds
- **THEN** ACP Skills SHALL atomically persist model C as the run-effective selection
- **AND** subsequent execution and UI projection SHALL use model C.

### Requirement: ACP Runtime Catalog Is Shared Without Sharing Current Ownership

ACP Chat and ACP Skills SHALL share protocol-generic runtime catalog normalization without sharing ownership of current values. ACP Chat current values SHALL be owned by its live session configuration. ACP Skills current values SHALL be owned by the persisted run-effective selection.

#### Scenario: Skills live catalog complements a persisted selection

- **WHEN** an ACP Skills session exposes live choices for a category
- **AND** the run already contains an effective selection for that category
- **THEN** the live choices SHALL update the run's catalog
- **AND** the live current or cached default SHALL NOT replace the persisted selection.

#### Scenario: Chat current remains live-session owned

- **WHEN** ACP Chat has live session configuration for a runtime category
- **THEN** its live choices and current value SHALL drive Chat projection
- **AND** ACP Skills run ownership SHALL NOT alter Chat precedence.

#### Scenario: Successful Skills setter has one state transition

- **WHEN** a run-scoped ACP Skills runtime setter succeeds
- **THEN** ACP Skills SHALL update the persisted run-effective fields in one state transition
- **AND** it SHALL NOT maintain a second writable per-run current snapshot.

### Requirement: ACP Skills SHALL expose auto-approve permission runtime option


ACP provider runtime options SHALL include a default-off boolean option for
auto-approving ACP backend permission requests during ACP Skill runs.

#### Scenario: Option is exposed for ACP provider

- **WHEN** ACP provider runtime options are described
- **THEN** the schema SHALL include `autoApproveAcpPermissions`
- **AND** the option SHALL default to `false`.

#### Scenario: Option survives without runtime cache

- **WHEN** ACP runtime options are normalized without a backend runtime options cache
- **AND** `autoApproveAcpPermissions` is `true`
- **THEN** the normalized options SHALL preserve `autoApproveAcpPermissions:
  true`.
### Requirement: ACP Skills settings SHALL warn on auto-approve permission option


Workflow settings UIs SHALL visually distinguish the ACP permission
auto-approval option as high risk.

#### Scenario: Warning text style

- **WHEN** workflow settings render `autoApproveAcpPermissions`
- **THEN** the option display text SHALL be bold and red
- **AND** the checkbox control behavior SHALL remain unchanged.

### Requirement: ACP connection tests and cache refresh SHALL isolate temporary controllers

ACP connection tests and cache refresh operations SHALL close only the temporary controller created for that operation.

#### Scenario: Successful temporary probe closes its controller

- **WHEN** a connection test or cache refresh succeeds
- **THEN** it SHALL complete and close its temporary shared controller once
- **AND** it SHALL preserve the successful cache result.

#### Scenario: Failed temporary probe closes its controller

- **WHEN** initialize times out, session creation fails, a write fails, or the diagnostic is cancelled
- **THEN** it SHALL settle through the same bounded shared-controller close.

#### Scenario: Existing engine remains isolated

- **GIVEN** another ACP controller is active
- **WHEN** a temporary connection test or cache refresh controller closes
- **THEN** it SHALL NOT signal or close the existing controller or unrelated desktop-session processes.

### Requirement: ACP runtime-options probes SHALL preserve validated signal targets
Backend connection tests and runtime-options cache refresh probes SHALL close their temporary ACP controllers through the shared target-preserving process cleanup boundary.

#### Scenario: Successful npx cache refresh closes its temporary controller
- **WHEN** an npx-backed runtime-options probe succeeds but the backend outlives EOF grace
- **THEN** any process-group escalation SHALL preserve the complete validated PGID
- **AND** the probe MUST NOT run an independent or ambiguous negative-PID command

#### Scenario: Failed cache refresh closes its temporary controller
- **WHEN** initialization or session creation fails
- **THEN** the temporary controller SHALL use the same bounded, target-preserving close path
- **AND** an existing user or ACP session process SHALL remain outside the cleanup target

### Requirement: ACP Reasoning State Preserves Its Semantic Source

ACP runtime state MUST distinguish explicit reasoning options from reasoning choices derived from model variants.

#### Scenario: Backend exposes independent thought level

- **WHEN** live `configOptions` contain an explicit `thought_level` selector
- **THEN** its choices and current value MUST be used as reasoning state
- **AND** an ordinary model update MUST NOT clear or recompute that reasoning state.

#### Scenario: Reasoning is derived from model variants

- **WHEN** the backend has no explicit reasoning data
- **AND** the selected model group exposes reasoning variants
- **THEN** reasoning MAY be derived from those variants
- **AND** it MUST be recomputed only when the corresponding model group changes.

#### Scenario: Backend exposes reasoning only

- **WHEN** an ACP session exposes selectable reasoning configuration but no mode or model selector
- **THEN** probing MUST recognize the session as having runtime option capability
- **AND** the reasoning choices and current value MUST be retained.

### Requirement: ACP Skills Model And Reasoning Share Editability

ACP Skills MUST gate model and reasoning setters with the same `modelConfigurationEditable` state.

#### Scenario: Model configuration is editable

- **WHEN** the selected ACP Skills session permits model configuration
- **AND** the backend exposes reasoning choices
- **THEN** both model and reasoning controls MUST be enabled.

#### Scenario: Model configuration is not editable

- **WHEN** the selected ACP Skills session does not permit model configuration
- **THEN** both model and reasoning controls MUST be disabled.

#### Scenario: Backend has no reasoning capability

- **WHEN** no live or cached reasoning capability exists
- **THEN** the UI MUST show a disabled Default reasoning placeholder
- **AND** that placeholder MUST NOT replace an existing real reasoning value.
