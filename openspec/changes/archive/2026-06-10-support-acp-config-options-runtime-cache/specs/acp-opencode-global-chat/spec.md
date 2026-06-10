## MODIFIED Requirements

### Requirement: ACP session updates are projected into structured sidebar state

The system SHALL project ACP session updates into structured conversation items
and session metadata, including runtime selectors advertised through ACP session
config options.

#### Scenario: Render ACP config option updates

- **WHEN** the agent emits `config_option_update` with select `configOptions`
- **THEN** the sidebar snapshot MUST update mode, model, and reasoning selector
  state from those config options
- **AND** existing transcript, diagnostics, and command update projection MUST
  remain unchanged.

### Requirement: ACP sidebar supports basic interactive controls

The system SHALL provide the minimum control surface required to complete an
interactive OpenCode ACP turn using either ACP config-option controls or legacy
mode/model controls.

#### Scenario: User changes advertised config option selectors

- **WHEN** the active ACP session advertises mode, model, or thought-level
  selectors through `configOptions`
- **THEN** the sidebar MUST show the corresponding mode/model/reasoning controls
- **AND** changing one of those selectors MUST call `session/set_config_option`.

#### Scenario: Legacy selector fallback remains available

- **WHEN** the active ACP session advertises only old mode/model state
- **THEN** changing mode or model MUST continue to use the existing legacy ACP
  session control.
