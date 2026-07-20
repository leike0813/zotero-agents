## ADDED Requirements

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
