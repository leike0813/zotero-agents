# acp-model-effort-selector Specification

## Purpose
TBD - created by archiving change split-acp-model-reasoning-effort-selector. Update Purpose after archive.
## Requirements
### Requirement: Model variants SHALL be folded into display model and effort selectors


When raw ACP model options contain multiple recognized effort variants for the same base model, the ACP chat frontend SHALL show one display model option and a separate reasoning effort selector.

#### Scenario: Recognized suffix variants are folded

- **GIVEN** raw models `gpt-5@low`, `gpt-5@medium`, and `gpt-5@high`
- **WHEN** the ACP snapshot is projected for the sidebar
- **THEN** the display model selector SHALL contain `gpt-5` once
- **AND** the reasoning selector SHALL contain `low`, `medium`, and `high`

#### Scenario: Plain models remain unchanged

- **GIVEN** raw models without multiple recognized effort variants
- **WHEN** the ACP snapshot is projected for the sidebar
- **THEN** the display model selector SHALL show the raw models
- **AND** the reasoning selector SHALL be hidden or unavailable
### Requirement: Frontend selections SHALL map back to raw ACP model IDs


Changing display model or reasoning effort SHALL apply the matching ACP model or
configuration value through the control mechanism advertised by the active ACP
session.

#### Scenario: Changing effort maps to advertised config option

- **GIVEN** the active ACP session advertises a `thought_level` config option
- **WHEN** the user selects a reasoning effort
- **THEN** the ACP adapter SHALL call `session/set_config_option` with the
  thought-level config id and selected value.

#### Scenario: Legacy model variant mapping remains available

- **GIVEN** the active ACP session does not advertise a model or thought-level
  config option
- **WHEN** the user changes display model or reasoning effort
- **THEN** the frontend SHALL map the selection to a raw ACP model id and use
  the existing model control path.
