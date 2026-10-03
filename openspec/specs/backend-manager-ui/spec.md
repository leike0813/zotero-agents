# Backend Manager UI

## Purpose

Provides the Zotero Backend Manager interface for Backend Profiles and the independent Built-in Agent Provider configuration page.

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

### Requirement: Backend Manager SHALL expose independent Built-in Agent configuration

The existing Backend Manager SHALL expose a fourth Built-in Agent page with Pi configurations, redacted credential status, catalog status, and scoped defaults. Pi actions SHALL persist independently of Backend Profile rows and SHALL leave ACP, SkillRunner, and Generic HTTP actions unchanged.

#### Scenario: Save a Pi configuration
- **WHEN** the user saves or disables a Pi configuration on the Built-in Agent page
- **THEN** the Pi state is updated and the existing Backend Profile configuration is unchanged

#### Scenario: No usable configuration exists
- **WHEN** the catalog or selected configuration is incomplete or unavailable
- **THEN** the page displays that state without offering an execution action

### Requirement: Built-in Agent page manages API keys without exposing plaintext

The Built-in Agent page SHALL allow setting, replacing, selecting, and clearing labeled API-key credentials independently of Backend Profiles. Plaintext SHALL appear only in the submitted credential action and encrypted store write, never in snapshots, saved drafts, logs, or result messages.

#### Scenario: User saves and clears a key
- **WHEN** a user saves an API key and later clears it
- **THEN** the page shows only redacted metadata and existing Backend Profile rows remain unchanged

### Requirement: Connection tests run only on explicit request

The Built-in Agent page SHALL run a Provider connection test only after a user action, correlate its response to that request, and show only redacted availability or failure state without changing defaults.

#### Scenario: User tests a configured Provider
- **WHEN** the user requests a connection test for the selected configuration
- **THEN** only that selected configuration is probed and the result contains no credential or Provider response body

### Requirement: Built-in Agent page manages MCP Tool Sources

The Built-in Agent page SHALL allow explicit source configuration, import preview, source testing, tool selection/review, direct-tool promotion, disable and delete without changing Backend Profile rows. It SHALL show redacted source credential metadata and request-bound test status, with no raw secret in snapshots or result messages.

#### Scenario: Review a discovered tool
- **WHEN** the user tests a source and selects a discovered tool
- **THEN** only the reviewed descriptor becomes eligible for a later turn

#### Scenario: Source credential stays private
- **WHEN** the user saves or imports a source credential
- **THEN** the page clears the input and subsequent snapshots contain only redacted metadata

### Requirement: Built-in Agent page manages Codex account connection

The Built-in Agent page SHALL offer connect, cancel, reconnect, and local disconnect actions for an explicitly selected OpenAI Codex configuration. It SHALL show only a request-bound verification URL, one-time user code, masked account status, and redacted completion or failure state. Device codes SHALL remain transient and stale action results SHALL NOT replace a newer flow. While authorization is active, repeated connect/reconnect actions SHALL preserve the current request and code until explicit cancellation or completion.

#### Scenario: User connects a Codex account
- **WHEN** the user starts a Codex connection
- **THEN** the page displays the verification address and code for that request while its existing Backend Profile rows remain unchanged

#### Scenario: User disconnects locally
- **WHEN** the user disconnects the selected Codex credential
- **THEN** the local encrypted credential is removed, a later invocation fails closed, and other credentials remain available

#### Scenario: Connect is repeated during authorization
- **WHEN** an authorization request already owns a displayed device code and connect is triggered again
- **THEN** the current request and code remain unchanged and no new authorization request is sent

### Requirement: Built-in Agent page refreshes official Codex models

The page SHALL offer explicit model refresh for a saved connected Codex configuration and SHALL query its credential-bound catalog after login. Catalog query results SHALL be request-correlated; changing the selected credential SHALL NOT display another credential's discovered models.

#### Scenario: Connected account refreshes its models
- **WHEN** the user refreshes models for a connected Codex configuration
- **THEN** selectable models and configuration availability reflect the official discovered facts for that credential

#### Scenario: Host publishes an unchanged catalog snapshot
- **WHEN** the host publishes a configuration snapshot with the same catalog revision
- **THEN** current queried model candidates remain visible, while a changed provider or credential clears old candidates and rejects stale query results

### Requirement: Built-in Agent page manages explicit Web source order

The page SHALL expose enable/disable, accessible ordering, endpoint/model/credential bindings, applicable local/code-execution approval, and user-initiated request-bound tests. It SHALL warn that enabled optional sources may incur account charges. Saved sources SHALL contain no secrets or test response and SHALL NOT change Backend Profiles or connect implicitly.

#### Scenario: Save and test are separate
- **WHEN** a user saves sources and explicitly tests one
- **THEN** only the test performs network activity and its safe result matches requestId

### Requirement: Directory controls preserve drafts and bounded region identity
The Built-in Agent page SHALL expose safe public/overlay/account source states, independent revision, check/data times, retained-data failures and explicit public refresh, automatic-update toggle, previous recovery, overlay refresh/removal and selected-account discovery. Actions/results SHALL be request-associated. Candidate/status updates SHALL preserve unsaved form/default choices and unrelated region DOM identity, without publishing full directory, credentials or private paths.

#### Scenario: Candidate disappears while a form is unsaved
- **WHEN** directory status or recommendations update during a draft edit
- **THEN** the draft model and defaults remain unchanged and stale results cannot replace another query's candidates
