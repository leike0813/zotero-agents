## ADDED Requirements

### Requirement: Reasoning catalogs SHALL belong to their selected model context

Cached reasoning choices SHALL be bound to complete raw model ID, effective mode and backend configuration identity. Unknown catalogs SHALL be distinct from an authoritative absence of reasoning. A legacy cache SHALL prove only its recorded current model. Discovery, forms and static provider validation SHALL use the same context-bound catalog.

#### Scenario: Select MiniMax after probing another model

- **WHEN** the backend default model advertises `high` and another model has not been probed
- **THEN** the default model's reasoning choices SHALL not be offered for the other model
- **AND** successful targeted preparation SHALL retain the connection-test status and backend default current values.

### Requirement: Reasoning validation SHALL follow live model configuration

ACP startup and recovery SHALL validate explicit reasoning against authoritative configuration after mode and model application. Unavailable choices SHALL fail with `provider_profile_option_unavailable`, retaining the requested value and model context. Backend RPC failures SHALL propagate unchanged. Unspecified categories SHALL send no override; no invalid selection SHALL be silently removed or replaced.

#### Scenario: Model setter removes reasoning capability

- **WHEN** the selected model's configuration removes `thought_level` and the request explicitly asks for `high`
- **THEN** startup SHALL fail with the structured unavailable error before the first prompt.

#### Scenario: Model setter introduces reasoning capability

- **WHEN** a model setter introduces an advertised requested reasoning value
- **THEN** startup SHALL apply it through the advertised configuration setter and continue to prompting.

## MODIFIED Requirements

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
- **THEN** the UI MUST disable unavailable reasoning choices and show the Default reasoning placeholder
- **AND** that placeholder MUST NOT replace an existing real reasoning value.
- **AND** an existing explicit value SHALL remain visible and allow the user to clear it to unspecified.
