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

### Requirement: Readonly UI Harness SHALL emulate Synthesis host localization

The readonly UI harness SHALL provide the same Synthesis i18n envelope shape as
the real Zotero host while continuing to load the original Workbench UI pages.

#### Scenario: Harness sends Synthesis UI messages

- **WHEN** the harness sends `synthesis:init`, `synthesis:snapshot`,
  `synthesis:chrome`, `synthesis:surface`, or `synthesis:surface-error`
- **THEN** it SHALL include a top-level `payload.i18n` envelope with the active
  locale and Synthesis messages
- **AND** it SHALL NOT require test fixtures or readonly service callers to
  manually include localization messages.

#### Scenario: Developer changes harness locale

- **WHEN** the developer changes the harness locale selector
- **THEN** the selector SHALL remain in the harness shell outside the real
  Workbench iframe
- **AND** the harness SHALL replay standard Synthesis Workbench messages with
  the new locale envelope
- **AND** it SHALL NOT modify or fork the Synthesis page implementation.

### Requirement: Readonly UI Harness SHALL read Synthesis data from stable SQLite snapshots

The readonly UI harness SHALL avoid direct long-lived reads from Zotero/plugin
live SQLite databases when building Synthesis surfaces.

#### Scenario: Zotero is running while harness reads Index or Tags

- **WHEN** Zotero or the plugin has the live SQLite database open
- **AND** the harness opens readonly adapters for Synthesis data
- **THEN** the harness SHOULD create a stable readonly database snapshot before
  issuing surface queries
- **AND** Index, Tags, Concepts, Review, and Graph reads SHALL use the snapshot
  through the shared readonly adapter helper
- **AND** the harness SHALL NOT write Zotero DB, plugin DB, filesystem-backed
  Synthesis data, clipboard, or backend state.

### Requirement: Harness SHALL preserve Workbench surface refresh protocol semantics

The readonly UI harness SHALL preserve Synthesis Workbench surface generation
and transient-error semantics when it relays or mocks surface messages.

#### Scenario: Harness surface response is stale

- **WHEN** the harness sends a Synthesis surface response with older request
  metadata than the latest accepted response
- **THEN** the original Workbench frontend SHALL ignore it
- **AND** the harness SHALL NOT compensate by injecting fake data.

#### Scenario: Harness read fails transiently

- **WHEN** a harness-backed readonly surface read fails transiently
- **THEN** the page SHALL show the same diagnostic/last-known-good behavior as
  the plugin-hosted Workbench.
