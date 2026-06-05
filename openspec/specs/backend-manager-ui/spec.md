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

