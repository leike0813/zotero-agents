## ADDED Requirements

### Requirement: Backend Manager SHALL offer Generic HTTP backend presets

Backend Manager SHALL let users add common Generic HTTP backend profiles from
host-owned presets without manually entering endpoint, auth mode, token
placeholder, or default timeout metadata.

#### Scenario: User previews and confirms a Generic HTTP backend preset
- **WHEN** the user clicks the Generic HTTP "add from preset" action
- **THEN** Backend Manager SHALL open a preset selection subwindow
- **AND** the subwindow SHALL show Generic HTTP presets on the left
- **AND** it SHALL show a read-only backend profile preview on the right.

#### Scenario: MinerU Official preset metadata is shown
- **WHEN** the user selects the `MinerU Official` preset
- **THEN** the preview SHALL show profile id `mineru-official`
- **AND** the preview SHALL show display name `MinerU Official`
- **AND** the preview SHALL show base URL `https://mineru.net`
- **AND** the preview SHALL show bearer authentication
- **AND** the preview SHALL show timeout `600000`.

#### Scenario: Preset note link opens externally
- **WHEN** the selected Generic HTTP preset declares a localized note link
- **THEN** the subwindow SHALL show the localized note text
- **AND** clicking the note link SHALL ask the Zotero host to open the link
  externally.

#### Scenario: Confirmed preset adds a normal editable Generic HTTP row
- **WHEN** the user confirms the Generic HTTP preset subwindow
- **THEN** Backend Manager SHALL append a normal editable Generic HTTP row
  matching the preset
- **AND** the token input SHALL remain empty
- **AND** the token input SHALL show the preset token placeholder.

#### Scenario: Generic HTTP preset backend already exists
- **GIVEN** Backend Manager already contains a row with the preset backend id
- **WHEN** the user confirms the same Generic HTTP preset
- **THEN** Backend Manager SHALL NOT append a duplicate row
- **AND** it SHALL surface that the preset profile already exists.

#### Scenario: Manual Generic HTTP profile creation remains available
- **WHEN** the user clicks the generic add action for Generic HTTP profiles
- **THEN** Backend Manager SHALL append an empty editable Generic HTTP row
- **AND** existing auth token validation and persistence behavior SHALL be
  preserved.
