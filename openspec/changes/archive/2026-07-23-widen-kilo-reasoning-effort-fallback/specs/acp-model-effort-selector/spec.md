## MODIFIED Requirements

### Requirement: Frontend selections SHALL map back to raw ACP model IDs

Changing display model or reasoning effort SHALL apply the matching ACP model or
configuration value through the control mechanism advertised by the active ACP
session.

When a Kilo ACP session rejects a `thought_level` config option value with
JSON-RPC invalid parameters (`-32602`) and the error message indicates an
effort-related rejection, the frontend SHALL retain its last confirmed reasoning
selection and leave the session's model-default reasoning configuration in
effect. All other configuration failures SHALL remain visible errors.

#### Scenario: Changing effort maps to advertised config option

- **GIVEN** the active ACP session advertises a `thought_level` config option
- **WHEN** the user selects a reasoning effort
- **THEN** the ACP adapter SHALL call `session/set_config_option` with the
  thought-level config id and selected value.

#### Scenario: Kilo none falls back to the model default

- **GIVEN** the active Kilo ACP session rejects a `thought_level` value with code `-32602` and error message indicating an effort-related rejection
- **WHEN** the user selects a reasoning effort value that triggers the rejection
- **THEN** the frontend SHALL not apply the rejected value to its current selection
- **AND** the current session continues with the model-default reasoning setting.

#### Scenario: Legacy model variant mapping remains available

- **GIVEN** the active ACP session does not advertise a model or thought-level
  config option
- **WHEN** the user changes display model or reasoning effort
- **THEN** the frontend SHALL map the selection to a raw ACP model id and use
  the existing model control path.
