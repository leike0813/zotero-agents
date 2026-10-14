# Spec Delta

## MODIFIED Requirements

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
