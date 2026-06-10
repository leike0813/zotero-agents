## Requirements
### Requirement: Local Readonly Harness Startup


The system SHALL provide a development-only local UI harness that starts with
`npm run harness:ui` and does not require Zotero to be running.

#### Scenario: Harness reads configured data paths

- **WHEN** the harness starts
- **THEN** it reads `ZOTERO_PLUGIN_DATA_DIR` from the project `.env`
- **AND** it locates `zotero.sqlite` and
  `zotero-agents/state/zotero-agents.db` under that directory.
- **AND** it reads Zotero profile prefs from `ZOTERO_PLUGIN_PROFILE_PATH` or
  `ZOTERO_PREFS_PATH` when configured.

#### Scenario: Dashboard uses backend profiles and workflows

- **WHEN** Dashboard data is requested
- **THEN** the harness SHALL read backend profiles through the plugin backend
  registry using the read-only prefs adapter
- **AND** it SHALL scan builtin and user workflow directories for Dashboard
  workflow cards and workflow option descriptors.

#### Scenario: Missing database paths are diagnostic

- **WHEN** either configured database path is missing
- **THEN** the harness SHALL expose diagnostics in the UI
- **AND** it SHALL NOT fall back to fabricated library data.
### Requirement: Original Plugin UI Reuse


The harness SHALL load the original plugin UI pages and scripts except for
necessary host bridge and adapter code.

#### Scenario: Workspace and workbench pages are loaded

- **WHEN** the harness page opens
- **THEN** it loads the original Workspace, Dashboard, Synthesis Workbench, and
  Assistant Workspace pages in iframes.

#### Scenario: UI source changes reload the harness

- **WHEN** a developer edits harness-served UI source under `src/**` or
  `addon/content/**`
- **THEN** the harness SHALL refresh connected browser pages
- **AND** changes under `src/**` SHALL rebuild only the harness browser bundles,
  not the Zotero plugin package.
### Requirement: Readonly Data and Mocked Writes


The harness SHALL read real test data and SHALL NOT modify Zotero DB, plugin DB,
host state, external backends, file manager state, or clipboard state.

#### Scenario: Host command is write-capable

- **WHEN** a UI page sends a write-capable host command
- **THEN** the command is added to the mock action log
- **AND** no database write or external API call is performed.

### Requirement: UI Harness SHALL mock Revise Canonicals write actions

The readonly UI harness SHALL surface Revise Canonicals data from the synthesis readonly service while blocking write actions.

#### Scenario: User triggers canonical write action in harness

- **WHEN** the harness receives canonical merge, apply pending, metadata update, or archive commands
- **THEN** it SHALL add the command to the mock action log
- **AND** it SHALL classify the blocked reason as `db-write`
- **AND** it SHALL NOT write Zotero DB, plugin DB, filesystem, clipboard, or backend state.

#### Scenario: User checks harness diagnostics

- **WHEN** harness status is requested
- **THEN** synthesis diagnostics SHALL include available canonical revision proposal and mock action counts where available.
