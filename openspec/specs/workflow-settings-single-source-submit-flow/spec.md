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
For SkillRunner workflows, UI exposure and request payload MUST follow the skill-level execution mode declared by `request.create.mode` or `request.sequence.steps[].mode`.

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

### Requirement: Provider options SHALL be scoped to their selected backend

Provider runtime option schema entries SHALL declare workflow or backend retention. Changing backend SHALL discard backend-scoped values and values outside the target provider schema before target normalization. The selected control value, draft value, and submitted value SHALL be identical.

#### Scenario: Backend catalogs contain different modes

- **GIVEN** backend A selected a mode unavailable on backend B
- **WHEN** the user switches to backend B without touching the mode control
- **THEN** the draft and submission use backend B's canonical selection
- **AND** workflow-scoped auto-approval and timeout values remain unchanged.

#### Scenario: Invalid select current is rendered

- **WHEN** a select receives a current value absent from its options
- **THEN** its displayed value, selected row, getter, collector, and later callbacks all use the same canonical fallback.

### Requirement: Submit confirmation SHALL capture one immutable Host-options snapshot

The submit flow MUST resolve workflow parameters, provider choice, and normalized
Host queue options into one confirmed snapshot. Execution planning and queue
creation MUST consume that snapshot rather than re-reading persisted defaults.

#### Scenario: User overrides the persisted maximum for one multi-unit submit

- **WHEN** a multi-unit dialog opens with persisted maximum concurrency `4` and the user submits with `2`
- **THEN** that submission SHALL capture maximum concurrency `2`
- **AND** changing the persisted default later SHALL NOT alter the active submission

#### Scenario: User submits an empty maximum

- **WHEN** the visible multi-unit maximum-concurrency control is empty at confirmation
- **THEN** the confirmed snapshot SHALL represent unlimited Host concurrency

### Requirement: Maximum concurrency SHALL be an optional workflow-level runtime control

When a submit dialog for ACP Skills or SkillRunner shows more than one legal
execution unit, it MUST expose a maximum-concurrency control below that unit
list. The control MUST accept only non-negative integers, describe `0` and blank
as unlimited, default to the workflow's persisted Host option, and offer the
existing workflow-default persistence interaction. When the unit list is
hidden, the control MUST be hidden as well.

#### Scenario: User enters a fractional or negative value

- **WHEN** the submit dialog contains a negative integer, fraction, or non-numeric value
- **THEN** confirmation SHALL be blocked with field-level validation
- **AND** no queue or backend task SHALL be created

#### Scenario: User persists the submitted value

- **WHEN** the user confirms a valid maximum in a multi-unit dialog and chooses to save workflow defaults
- **THEN** the canonical Host option SHALL be saved through the workflow settings domain
- **AND** the current submission SHALL use the same normalized value

#### Scenario: Unsupported provider is selected

- **WHEN** a workflow submission targets Generic HTTP or pass-through
- **THEN** the native Host maximum-concurrency control SHALL remain hidden
- **AND** that provider's execution SHALL remain unchanged

### Requirement: Submit preview SHALL show declaratively legal execution units

The submit gate MUST evaluate availability-phase declarative selection
validation against one immutable selection-context snapshot captured when
the user triggers the workflow. When more than one availability-valid
execution unit exists, the dialog MUST show an ordered, compact,
one-row-per-unit preview using truncated `taskName` display. The preview
MUST remain fixed for that dialog instance and MUST NOT execute provider
preflight, request building, provider execution, or apply hooks.

#### Scenario: Multiple legal units are selected

- **WHEN** declarative validation resolves two or more legal execution units
- **THEN** the left side of the submit dialog SHALL list all legal units in execution order
- **AND** each row SHALL use compact truncated task-name presentation without execution details

#### Scenario: Selection changes while the dialog is open

- **GIVEN** the user triggered a workflow with selection context A
- **WHEN** the Zotero selection changes to context B before the user confirms submission
- **THEN** the dialog SHALL retain the preview derived from context A
- **AND** confirmed preparation SHALL plan against context A rather than reading context B

#### Scenario: Non-configurable workflow prepares asynchronously

- **WHEN** a non-configurable workflow is triggered and the Zotero selection changes while preparation is pending
- **THEN** preparation SHALL continue using the trigger-time selection context
- **AND** it SHALL NOT re-read the live selection to construct submitted units

#### Scenario: Confirmed settings change execute-mode planning

- **GIVEN** the trigger-time selection context is fixed
- **WHEN** the user changes workflow parameters or provider options before confirmation
- **THEN** confirmed execute-mode planning MAY filter or expand units according to those settings
- **AND** every confirmed plan SHALL still use the fixed trigger-time selection context as its input

#### Scenario: Selection snapshot construction fails

- **WHEN** the trigger-time selection context cannot be constructed
- **THEN** the workflow SHALL halt through the existing workflow failure path
- **AND** confirmation-time live selection SHALL NOT be used as a fallback

#### Scenario: Invalid selected entries are filtered out

- **WHEN** the current selection contains both declaratively legal and illegal entries
- **THEN** the preview SHALL list only the legal execution units
- **AND** the submit count SHALL match the planned top-level units

#### Scenario: Form values change after preview

- **WHEN** the user edits any field in the open submission dialog
- **THEN** the dialog SHALL retain its original availability preview
- **AND** confirmed execute-mode preparation SHALL remain authoritative for the submitted settings

#### Scenario: Preview encounters execution-time expansion

- **WHEN** provider preflight would later expand a legal source unit
- **THEN** the submit preview SHALL still show the single declarative source unit
- **AND** it SHALL NOT predict or display preflight-derived children

#### Scenario: Full preparation changes the candidate set

- **WHEN** confirmed execute-mode preparation omits or expands one or more previewed candidates
- **THEN** the execution plan SHALL remain authoritative
- **AND** only executable prepared units SHALL enter Host queue admission

#### Scenario: Zero or one legal unit exists

- **WHEN** declarative validation resolves no more than one legal execution unit
- **THEN** the multi-unit list region SHALL remain hidden
- **AND** the maximum-concurrency control SHALL remain hidden
