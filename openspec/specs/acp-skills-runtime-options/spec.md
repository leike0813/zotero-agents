# acp-skills-runtime-options Specification

## Purpose
TBD - created by archiving change govern-acp-skills-runtime-options. Update Purpose after archive.
## Requirements
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
### Requirement: Frozen Run Runtime Options


ACP Skills runs MUST freeze selected runtime options at submission time.

#### Scenario: Run Starts

Given a workflow is submitted with ACP mode/model/reasoning options
When the ACP task session is created
Then the runner MUST apply the selected mode/model before sending the prompt
And the run snapshot MUST display the frozen choices.
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

### Requirement: ACP Runtime Option State Has Canonical Precedence

ACP Chat and ACP Skills MUST resolve runtime option choices and current values through one canonical runtime-state policy.

#### Scenario: Live configuration and cache both contain a category

- **WHEN** live session configuration exposes a selectable runtime option category
- **AND** the backend cache or stored run contains the same category
- **THEN** the live choices and current value MUST take precedence
- **AND** cached or stored state MUST only fill categories omitted by live configuration.

#### Scenario: Legacy live fields fill absent config options

- **WHEN** live `configOptions` omit mode or model
- **AND** the live session exposes the corresponding legacy field
- **THEN** the legacy live field MUST fill that missing category before backend cache is considered.

#### Scenario: Successful setter updates current state

- **WHEN** a runtime option setter succeeds with a value present in the resolved choices
- **THEN** that value MUST immediately become current in the runtime snapshot
- **AND** ACP Skills MUST update its effective run field in the same state transition.

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
