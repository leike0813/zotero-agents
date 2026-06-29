# backend-manager-ui Specification

## Purpose
TBD - created by archiving change embed-skillrunner-management-ui. Update Purpose after archive.
## Requirements
### Requirement: Backend Manager MUST expose SkillRunner management-page entry
系统 MUST 在 Backend Manager 的 SkillRunner profile 行提供“进入管理页面”动作，用于直接打开对应后端的管理 UI。  
对于插件托管本地后端 `local-skillrunner-backend`，Backend Manager SHALL 隐藏该行，避免用户误编辑；保存时 SHALL 保留该托管后端配置。

#### Scenario: local deploy auto-profile conflict is surfaced without overwrite
- **WHEN** Preferences local deploy flow attempts to auto-create `local-skillrunner-backend` profile but Backend Manager data already contains conflicting entry
- **THEN** system SHALL present a conflict warning for manual resolution
- **AND** system SHALL NOT overwrite the existing Backend Manager profile automatically

#### Scenario: managed local backend is hidden but preserved on save
- **WHEN** Backend Manager loads config containing `local-skillrunner-backend`
- **THEN** the UI SHALL NOT render an editable row for that backend
- **AND** saving changes to other rows SHALL keep the managed backend entry in persisted config

### Requirement: Backend Internal ID And Display Name Separation
Backend profiles SHALL use immutable internal IDs for runtime binding and editable display names for user-visible labels.

#### Scenario: Legacy profile migration
- **WHEN** backend config entries have `id` but no `displayName`
- **THEN** plugin SHALL set `displayName = old.id`
- **AND** plugin SHALL generate a new unique internal `id`

### Requirement: Managed Local Backend Isolation
Backend manager SHALL hide managed local backend entries using canonical managed ID only.

#### Scenario: Hide managed local backend
- **WHEN** backend manager renders backend rows
- **THEN** entries with ID `local-skillrunner-backend` SHALL NOT be shown in backend manager

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

### Requirement: Backend manager MUST open SkillRunner management through Dashboard

Backend Manager MUST route SkillRunner profile management to the shared
Dashboard backend tab surface.

#### Scenario: open management from backend profile row

- **WHEN** 用户点击 SkillRunner profile 行的"进入管理页面"
- **THEN** 插件 MUST open or focus Task Dashboard
- **AND** Dashboard MUST select that backend tab's management subview
- **AND** Backend Manager MUST NOT open a standalone ztoolkit management dialog.

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

