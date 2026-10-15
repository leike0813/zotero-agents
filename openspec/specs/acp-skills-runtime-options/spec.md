# acp-skills-runtime-options Specification

## Purpose
TBD - created by archiving change govern-acp-skills-runtime-options. Update Purpose after archive.
## Requirements
### Requirement: ACP Skills runtime selections SHALL belong to the active catalogs

ACP Skills SHALL validate submitted, persisted, session-reconciled, and runtime-edited mode, provider, display model, raw model, and reasoning selections against the selected backend or live session catalogs before persistence or transport. An invalid or ambiguous explicit selection SHALL be reported as `provider_profile_option_unavailable` with its original value preserved; it SHALL NOT be replaced by an observed current value, by a first catalog entry, or by a different variant of the same model. An unspecified category SHALL remain unset and SHALL NOT send a configuration override. A model identifier SHALL be interpreted within its `acpModelProvider` group, and the canonical selection tuple SHALL remain distinct from the existing flat provider-options wire representation.

#### Scenario: Old backend mode reaches a new backend

- **GIVEN** backend A selected `code`
- **AND** backend B exposes only `ask` and `build` with current `build`
- **WHEN** a run is submitted to backend B with the stale `code` selection
- **THEN** submission SHALL fail with `provider_profile_option_unavailable`
- **AND** `code` SHALL NOT be persisted, transported, or replaced by `build`.

#### Scenario: Live catalog differs from submission cache

- **WHEN** a submitted selection is absent from the new session catalog
- **THEN** ACP Skills SHALL reject it with `provider_profile_option_unavailable`
- **AND** it SHALL NOT attempt an invalid setter call or substitute another value.

#### Scenario: Runtime action names an unknown option

- **WHEN** a run-scoped mode, provider, model, or reasoning action names a value outside its live catalog
- **THEN** the action is rejected before transport
- **AND** the persisted run-effective selection remains unchanged.

#### Scenario: Provider-qualified model is validated in its provider group

- **WHEN** an ACP selection names `acpModelProvider` and `acpModelId`
- **THEN** validation checks membership in that provider's model group
- **AND** the requested raw model id is applied as given
- **AND** a valid tuple is not reported as `could_not_be_applied` because it was
  compared against a different raw id.

#### Scenario: Unspecified categories send no override

- **GIVEN** a submission omits mode, model, and reasoning
- **WHEN** the run session is created and the first prompt is prepared
- **THEN** ACP Skills SHALL NOT send configuration override RPCs for those categories
- **AND** the UI SHALL show the backend current value when one exists.

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

ACP catalog diagnostics SHALL report source, revision, refreshedAt, state and consistency. Workflow forms SHALL continue displaying existing cached options when age or stale status indicates a manual refresh is due. Static membership checks SHALL use that cache, and runtime selection SHALL validate against live session metadata before prompting. Public provider-profile readiness SHALL continue reporting its catalog diagnostics.

#### Scenario: Stale cache remains usable by workflow forms

- **WHEN** an existing ACP runtime cache expires
- **THEN** the form displays cached options and prompts a manual refresh
- **AND** changing a provider or model SHALL NOT refresh the cache
- **AND** unavailable live selections SHALL fail before the first prompt.

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


ACP connection tests MUST cache supported modes, models, and backend-advertised
reasoning choices from ACP session configuration state. The cache SHALL serve
offline display and pre-submission static membership checks only; it SHALL NOT
override categories the live session declares.

#### Scenario: Successful probe from config options

- **WHEN** an ACP backend probe succeeds and `session/new` returns select
  `configOptions` for mode, model, or thought level
- **THEN** the backend MUST persist a passing connection test and runtime
  options cache derived from those config options
- **AND** old `modes` / `models` fields MUST remain supported when config
  options are absent.
- **AND** the model cache SHALL contain all backend-advertised model providers and their complete model identifiers.

#### Scenario: Empty or failed refresh preserves existing cache

- **GIVEN** an ACP backend already has a non-empty runtime options cache
- **WHEN** a refresh fails or returns no selectable mode/model data
- **THEN** the backend MUST NOT replace the existing runtime options cache with
  an empty or missing cache.

#### Scenario: Live declarations outrank stale cached categories

- **GIVEN** the cached catalog lists categories for a backend
- **WHEN** a live session declares a different or smaller set of categories
- **THEN** the live session metadata SHALL be authoritative
- **AND** the stale cached categories SHALL NOT be presented as available choices.
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

ACP Skills SHALL persist each run's effective mode, model, raw model, and reasoning selection in the run record. The persisted run selection SHALL be the sole current-value source used by execution, recovery, and UI projection. A value SHALL become current only after a successful setter RPC or an authoritative backend update confirms it.

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
- **THEN** the run SHALL remain unselected for that category
- **AND** ACP Skills SHALL NOT select the first catalog choice as current.

#### Scenario: Successful run-scoped edit changes the effective selection

- **GIVEN** a waiting run currently uses model B
- **WHEN** the user changes the model to C and the remote setter succeeds
- **THEN** ACP Skills SHALL atomically persist model C as the run-effective selection
- **AND** subsequent execution and UI projection SHALL use model C.

#### Scenario: Failed setter does not become current

- **WHEN** a run-scoped runtime setter RPC fails
- **THEN** the rejected value SHALL NOT be persisted as the run-effective selection
- **AND** the previously confirmed value SHALL remain current.

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

ACP runtime state SHALL derive reasoning only from backend-advertised explicit
reasoning metadata. Internal state SHALL NOT carry a model-derived reasoning
source, and a model change SHALL NOT recompute, clear, or derive reasoning.

#### Scenario: Backend exposes independent thought level

- **WHEN** live configuration contains an explicit `thought_level` selector
- **THEN** its choices and current value MUST be used as reasoning state
- **AND** an ordinary model update MUST NOT clear or recompute that reasoning state.

#### Scenario: Reasoning is derived from model variants

- **WHEN** the backend has no explicit reasoning data
- **AND** the selected model group exposes suffixed variants
- **THEN** reasoning SHALL no longer be derived or recomputed from those variants
- **AND** the derived reasoning source and its cache execution path SHALL be removed.

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
- **THEN** workflow forms MUST disable the reasoning field and leave its default unspecified
- **AND** model/provider/mode changes MUST discard reasoning unavailable in the selected cached context.

### Requirement: Reasoning catalogs SHALL belong to their selected model context

Cached reasoning choices SHALL be bound to complete raw model ID, effective mode, backend configuration identity and parent catalog revision. Unknown catalogs SHALL be distinct from an authoritative absence of reasoning. A legacy cache SHALL prove only its recorded current model. Forms and static provider validation SHALL use the same context-bound catalog. Cache age or stale status SHALL prompt manual refresh while existing cached choices remain usable; workflow selection changes SHALL NOT probe.

#### Scenario: Select MiniMax after probing another model

- **WHEN** the backend default model advertises `high` and another model has not been probed
- **THEN** the default model's reasoning choices SHALL not be offered for the other model
- **AND** the reasoning field SHALL remain disabled and unspecified until matching cached metadata is available.

### Requirement: Reasoning validation SHALL follow live model configuration

ACP startup and recovery SHALL validate explicit reasoning against authoritative configuration after mode and model application. Unavailable choices SHALL fail with `provider_profile_option_unavailable`, retaining the requested value and model context. Backend RPC failures SHALL propagate unchanged. Unspecified categories SHALL send no override; no invalid selection SHALL be silently removed or replaced.

#### Scenario: Model setter removes reasoning capability

- **WHEN** the selected model's configuration removes `thought_level` and the request explicitly asks for `high`
- **THEN** startup SHALL fail with the structured unavailable error before the first prompt.

#### Scenario: Model setter introduces reasoning capability

- **WHEN** a model setter introduces an advertised requested reasoning value
- **THEN** startup SHALL apply it through the advertised configuration setter and continue to prompting.

### Requirement: ACP complete catalog probes SHALL settle within one lifecycle budget

A complete catalog probe SHALL apply one total budget to setup, adapter launch, initialization, session reading and cleanup. Cancellation or deadline expiry SHALL prevent successful cache publication. Temporary adapters acquired after cancellation SHALL be closed through the existing controller cleanup path. Cleanup SHALL be bounded and SHALL preserve unrelated controllers.

#### Scenario: Cancel initialization or session reading
- **WHEN** the probe is canceled before its result is published
- **THEN** it SHALL settle as unsuccessful without publishing a replacement catalog
- **AND** its temporary adapter SHALL receive bounded cleanup.

#### Scenario: Adapter launch completes after expiry
- **WHEN** adapter launch resolves after the probe deadline
- **THEN** the late adapter SHALL be closed
- **AND** the probe SHALL not resume initialization or return success.

#### Scenario: Multiple phases consume the budget
- **WHEN** initialization and session reading together exceed the total probe budget
- **THEN** the second phase SHALL receive only the remaining budget
- **AND** a stalled close SHALL not keep the probe pending indefinitely.

### Requirement: Explicit disabled ACP permission approval SHALL remain a valid setting

ACP permission approval SHALL accept both boolean values through workflow settings and strict provider profile validation. Explicit false SHALL remain disabled through persistence and runtime projection, including when replacing an earlier true value.

#### Scenario: Disable a previously enabled approval
- **WHEN** the user unchecks ACP permission approval and saves or confirms
- **THEN** validation SHALL accept false
- **AND** the resulting execution SHALL require permission approval through the existing manual path.
