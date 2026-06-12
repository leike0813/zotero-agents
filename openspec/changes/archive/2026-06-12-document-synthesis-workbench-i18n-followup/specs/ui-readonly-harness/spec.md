## ADDED Requirements

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
