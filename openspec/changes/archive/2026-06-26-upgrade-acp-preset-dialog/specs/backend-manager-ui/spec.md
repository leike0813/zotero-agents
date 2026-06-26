## MODIFIED Requirements

### Requirement: Backend Manager SHALL offer common ACP backend presets

Backend Manager SHALL let users add common ACP backend profiles from
host-owned agent presets without manually entering command, args, env, or ACP
agent-family metadata.

#### Scenario: User previews and confirms an ACP backend preset

- **WHEN** the user clicks the ACP "add from preset" action
- **THEN** Backend Manager SHALL open a preset configuration subwindow
- **AND** the subwindow SHALL show agent presets on the left
- **AND** it SHALL show launch options and a read-only backend profile preview
  on the right.

#### Scenario: Preset launch options update the preview

- **WHEN** the user selects an agent preset
- **THEN** Codex and Claude Code SHALL default `use npx` to enabled
- **AND** other agent presets SHALL default `use npx` to disabled
- **AND** `isolated environment` SHALL default to disabled for every preset.

#### Scenario: Npx launch warning is visible

- **WHEN** the user enables `use npx`
- **THEN** the preview SHALL switch to the preset's npx command line
- **AND** the subwindow SHALL show a Node.js and npm prerequisite warning with
  a Node.js link.

#### Scenario: Isolation option is gated by agent support

- **WHEN** a preset does not support an isolated environment
- **THEN** Backend Manager SHALL disable the isolation option
- **AND** enabling isolation for a supported preset SHALL add the managed env
  variable to the preview
- **AND** the subwindow SHALL warn that the user must configure and authenticate
  the agent inside the displayed isolation path.

#### Scenario: Confirmed preset adds a normal editable ACP row

- **WHEN** the user confirms the preset subwindow
- **THEN** Backend Manager SHALL append a normal editable ACP row matching the
  read-only preview
- **AND** saving SHALL persist the row through the existing backend profile
  persistence path.

#### Scenario: Cancelled preset does not mutate draft rows

- **WHEN** the user cancels the preset subwindow
- **THEN** Backend Manager SHALL close the subwindow without adding a row.

#### Scenario: Preset backend already exists

- **GIVEN** the Backend Manager already contains a row with the preview backend
  id
- **WHEN** the user confirms the same preset options
- **THEN** Backend Manager SHALL NOT append a duplicate row
- **AND** it SHALL surface that the preset profile already exists.

#### Scenario: Manual ACP profile creation remains available

- **WHEN** the user clicks the generic add action for ACP profiles
- **THEN** Backend Manager SHALL append an empty editable ACP row
- **AND** existing manual command, args, env, and validation behavior SHALL be
  preserved.
