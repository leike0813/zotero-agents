# workflow-settings-single-source-submit-flow Specification

## Purpose
TBD - created by archiving change workflow-settings-single-source-web-config. Update Purpose after archive.
## Requirements
### Requirement: Workflow settings SHALL use a single persisted source plus optional submit-time override
The system MUST treat `workflowSettingsJson` as the only persisted workflow settings source.  
Execution MUST merge persisted settings with an optional per-submit override snapshot, and MUST NOT consume run-once state.

#### Scenario: Execute with persisted settings only
- **WHEN** a workflow execution is triggered without submit override
- **THEN** execution context SHALL resolve from persisted workflow settings only
- **AND** no run-once state SHALL be read or mutated

#### Scenario: Execute with submit-time override
- **WHEN** a workflow execution is triggered with submit override
- **THEN** execution context SHALL merge persisted settings with that override for this execution
- **AND** persisted settings SHALL remain unchanged unless explicitly saved

### Requirement: Interactive workflow trigger SHALL enforce a pre-submit settings gate for configurable workflows
Interactive triggers MUST open workflow-specific settings page before submit when the target workflow has configurable dimensions.

#### Scenario: Configurable workflow opens submit settings page
- **WHEN** user triggers a configurable workflow from interactive entry
- **THEN** system SHALL open a workflow-specific web settings dialog
- **AND** submit SHALL continue only after user confirms

#### Scenario: Non-configurable workflow bypasses settings page
- **WHEN** user triggers a workflow with no configurable dimensions
- **THEN** system SHALL skip settings dialog
- **AND** system SHALL submit workflow directly

#### Scenario: Required backend profile is unavailable
- **WHEN** workflow requires backend profile and no candidate profile exists
- **THEN** dialog SHALL show a blocking message
- **AND** confirm action SHALL be disabled
- **AND** workflow SHALL NOT be submitted

#### Scenario: Settings gate initialization fails
- **WHEN** user triggers a configurable workflow from interactive entry
- **AND** settings dialog initialization fails before confirmation
- **THEN** system SHALL emit explicit failure feedback
- **AND** runtime diagnostics SHALL record the gate failure
- **AND** workflow SHALL NOT silently no-op

### Requirement: A single submit snapshot SHALL be shared by all jobs in the same batch
For one trigger action, execution settings snapshot MUST be resolved once and shared by all jobs generated from that submission.

#### Scenario: Multi-job batch shares identical snapshot
- **WHEN** one trigger produces multiple jobs
- **THEN** all jobs SHALL use the same resolved workflow params and provider options snapshot
- **AND** no per-job re-resolution SHALL change configuration within that batch

### Requirement: Dashboard SHALL expose persistent workflow options as a dedicated top-level tab
Dashboard MUST provide a top-level `Workflow选项 / Workflow Options` tab with workflow sub tabs for configurable workflows only.

#### Scenario: Workflow options tab only shows configurable workflows
- **WHEN** dashboard renders workflow options
- **THEN** only workflows with configurable dimensions SHALL be listed as sub tabs
- **AND** workflows without configurable dimensions SHALL be hidden

#### Scenario: Dashboard editing persists with debounce
- **WHEN** user edits a field in workflow options tab
- **THEN** system SHALL persist changes with debounce
- **AND** save state SHALL be observable as `saving/saved/error`

### Requirement: Workflow options editing SHALL remain stable while typing
The system MUST prevent periodic/task-update refresh from rebuilding workflow-options form while the user is editing fields.

#### Scenario: Periodic refresh is skipped in workflow-options tab
- **GIVEN** dashboard is currently on `workflow-options` tab
- **WHEN** periodic refresh or task-update refresh is triggered
- **THEN** workflow-options form SHALL NOT be rebuilt by that refresh
- **AND** user focus and dropdown interaction SHALL remain stable

### Requirement: SkillRunner runtime options SHALL be mode-gated
For SkillRunner workflows, UI exposure and request payload MUST follow `execution.skillrunner_mode`.

#### Scenario: Provider-aware engine submit snapshot uses explicit provider_id
- **WHEN** a SkillRunner workflow resolves execution context for a provider-aware engine
- **THEN** the resolved submit snapshot SHALL carry explicit `provider_id`
- **AND** `/v1/jobs` create payload SHALL submit `engine + provider_id + model + effort`
- **AND** frontend SHALL NOT require `provider/model` string as canonical request value

#### Scenario: Effort stays visible and model-scoped in settings UI
- **WHEN** the SkillRunner settings UI renders provider runtime options
- **THEN** it SHALL render `engine -> provider_id -> model -> effort` in that dependency order
- **AND** `effort` SHALL remain visible even when the selected model does not support custom effort
- **AND** unsupported-effort models SHALL expose only `default` and disable the effort selector

#### Scenario: Legacy persisted provider/model values are upgraded on write
- **WHEN** persisted settings still use legacy `model_provider`, `model="provider/model"`, `model="provider/model@effort"`, or `model="model@effort"`
- **THEN** frontend MAY read them for compatibility
- **AND** any subsequent settings save or submit-confirm writeback SHALL persist explicit `provider_id + model + effort`

#### Scenario: Provider-aware engine blocks empty provider selection
- **WHEN** a provider-aware engine is selected and `provider_id` is empty
- **THEN** model choices SHALL remain unavailable or invalid
- **AND** the frontend SHALL NOT form a valid SkillRunner submit payload

#### Scenario: Single-provider engines hide provider but still normalize canonical provider_id
- **WHEN** a single-provider engine such as `codex`, `gemini`, or `iflow` is selected
- **THEN** the settings UI SHALL hide the provider selector
- **AND** the resolved execution context SHALL still carry the engine's canonical `provider_id`

### Requirement: Submit dialog SHALL use compact layout and single cancel affordance
The submit dialog MUST remove framework-level duplicate cancel button and keep only page-level actions.

#### Scenario: No duplicate cancel button
- **WHEN** submit dialog is rendered
- **THEN** only in-page confirm/cancel actions SHALL be visible
- **AND** framework chrome SHALL NOT add an extra cancel button

### Requirement: Workflow settings SHALL list provider-compatible backend profiles

Workflow settings and submit gates MUST list backend profiles using the
provider-derived compatibility contract from `workflow-contract`.

#### Scenario: ACP provider settings list only ACP profiles

- **GIVEN** a workflow declares `provider: "acp"`
- **AND** the configured backends include ACP and SkillRunner profiles
- **WHEN** the workflow settings dialog or submit settings gate is opened
- **THEN** the profile selector SHALL include ACP profiles
- **AND** it SHALL NOT include SkillRunner profiles.

#### Scenario: SkillRunner provider settings list SkillRunner and ACP profiles

- **GIVEN** a workflow declares `provider: "skillrunner"`
- **AND** the configured backends include ACP and SkillRunner profiles
- **WHEN** the workflow settings dialog or submit settings gate is opened
- **THEN** both SkillRunner and ACP profiles SHALL be eligible.

#### Scenario: Persisted incompatible backend is rejected

- **GIVEN** persisted workflow settings contain a backend ID whose backend type
  is not compatible with the workflow provider
- **WHEN** execution context is resolved
- **THEN** the backend ID SHALL be rejected as incompatible
- **AND** the runtime SHALL NOT silently fall back based on `request.kind`.

#### Scenario: Dashboard quick-run uses provider compatibility

- **GIVEN** the Dashboard renders workflow quick-run controls
- **WHEN** it determines whether a workflow can run without showing settings
- **THEN** backend/profile availability SHALL be evaluated with
  provider-derived compatibility.

