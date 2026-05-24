## ADDED Requirements

### Requirement: Backend Manager SHALL offer common ACP backend presets

Backend Manager SHALL let users add common ACP backend profiles from host-owned
presets without manually entering command, args, or ACP agent-family metadata.

#### Scenario: User adds an ACP backend from a preset

- **WHEN** the user selects a common ACP agent preset in the ACP provider
  section and invokes add
- **THEN** Backend Manager SHALL append a normal editable ACP row
- **AND** the row SHALL be prefilled with stable backend id, display name,
  command, args, local base URL, and ACP agent family metadata
- **AND** saving SHALL persist the row through the existing backend profile
  persistence path.

#### Scenario: Preset backend already exists

- **GIVEN** the Backend Manager already contains a row with the preset backend id
- **WHEN** the user invokes the same preset add action
- **THEN** Backend Manager SHALL NOT append a duplicate row
- **AND** it SHALL surface that the preset profile already exists.

#### Scenario: Manual ACP profile creation remains available

- **WHEN** the user chooses the existing generic add action for ACP
- **THEN** Backend Manager SHALL still append an empty editable ACP row
- **AND** existing manual command, args, env, and validation behavior SHALL be
  preserved.
