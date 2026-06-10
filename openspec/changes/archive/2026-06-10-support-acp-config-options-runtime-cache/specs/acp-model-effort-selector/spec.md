## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: The ACP protocol surface SHALL remain unchanged

**Reason**: ACP v1 now defines `configOptions` and `session/set_config_option`
as the preferred session configuration surface. This change adopts that surface
while keeping legacy controls as fallback.
