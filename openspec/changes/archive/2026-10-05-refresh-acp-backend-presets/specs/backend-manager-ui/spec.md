# Spec Delta

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
- **THEN** Codex, Claude Code, Factory Droid, Pi ACP, and Amp ACP SHALL default
  `use npx` to enabled
- **AND** other agent presets SHALL default `use npx` to disabled
- **AND** `isolated environment` SHALL default to disabled for every preset.

#### Scenario: Kilo preset supports npx launch

- **WHEN** the user selects the Kilo ACP preset
- **THEN** Backend Manager SHALL allow the `use npx` option
- **AND** enabling `use npx` SHALL preview command `npx`
- **AND** the preview args SHALL include `-y`, `@kilocode/cli@latest`, and
  `acp`.

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

#### Scenario: Expanded ACP catalog exposes confirmed launch entries

- **WHEN** the user opens the ACP preset selector
- **THEN** the 15 existing preset IDs SHALL remain available
- **AND** the selector SHALL also offer Cursor native ACP, Kimi Code, MiniMax
  Code, Mistral Vibe, OpenHands, DeepSeek Harness, Factory Droid, Goose, Junie,
  Kiro CLI, Pi ACP, Amp ACP, and Oh My Pi.

#### Scenario: Updated existing launch entries use current ACP arguments

- **WHEN** the user creates a Gemini, Qwen, or Qoder preset profile
- **THEN** the local commands SHALL be `gemini --acp`, `qwen --acp`, and
  `qoder --acp`, respectively
- **AND** Qwen SHALL NOT include the ignored `--experimental-skills` flag
- **AND** the existing preset IDs and npm package identities SHALL be preserved.

#### Scenario: MiniMax npx launch selects the ACP executable explicitly

- **WHEN** the user enables npx for MiniMax Code
- **THEN** the preview and confirmed backend SHALL use
  `npx -y --package @minimax-ai/code@latest mcode acp`
- **AND** managed npx caching SHALL identify `@minimax-ai/code@latest` as the
  package, rather than `mcode`.

#### Scenario: OpenHands isolation includes conversation storage

- **WHEN** the user enables isolation for OpenHands
- **THEN** `OPENHANDS_PERSISTENCE_DIR` SHALL point to the managed profile root
- **AND** `OPENHANDS_CONVERSATIONS_DIR` SHALL point to its `conversations`
  subdirectory
- **AND** the normal profile SHALL NOT inject either isolation variable.

#### Scenario: Preset updates preserve saved backend profiles

- **GIVEN** the user has saved a backend created from a previous preset
- **WHEN** the preset catalog is updated and Backend Manager loads that backend
- **THEN** its saved command, arguments, environment, and ID SHALL remain intact
- **AND** creating a new backend SHALL use the current preset metadata.

#### Scenario: Documented isolation and verification have bounded scope

- **WHEN** ACP preset documentation describes isolated profiles and support
- **THEN** it SHALL identify Amp ACP isolation as adapter state relocation
- **AND** it SHALL distinguish configuration-directory relocation from external
  caches, keyrings, credentials, or project configuration that remain shared
- **AND** new source-confirmed presets SHALL NOT be described as having passed
  real-agent connection tests without such evidence.
