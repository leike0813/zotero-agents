## MODIFIED Requirements

### Requirement: Backend Manager SHALL offer common ACP backend presets

Backend Manager SHALL let users add common ACP backend profiles from host-owned
presets without manually entering command, args, or ACP agent-family metadata.

#### Scenario: User adds an ACP backend from a preset menu

- **WHEN** the user opens the ACP preset add menu and chooses a common ACP
  agent preset
- **THEN** Backend Manager SHALL append a normal editable ACP row
- **AND** the row SHALL be prefilled with stable backend id, display name,
  command, args, local base URL, and ACP agent family metadata
- **AND** saving SHALL persist the row through the existing backend profile
  persistence path.

#### Scenario: Hermes ACP preset is available

- **WHEN** the user chooses the Hermes ACP preset
- **THEN** Backend Manager SHALL append an ACP row for `acp-hermes`
- **AND** the row SHALL use command `hermes`, args `acp`, and ACP agent family
  `hermes`.

#### Scenario: Preset backend already exists

- **GIVEN** the Backend Manager already contains a row with the preset backend id
- **WHEN** the user invokes the same preset add action
- **THEN** Backend Manager SHALL NOT append a duplicate row
- **AND** it SHALL surface that the preset profile already exists.

#### Scenario: Manual ACP profile creation remains available through custom

- **WHEN** the user opens the ACP preset add menu and chooses the separated
  custom option
- **THEN** Backend Manager SHALL append an empty editable ACP row
- **AND** existing manual command, args, env, and validation behavior SHALL be
  preserved.
