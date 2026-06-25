## ADDED Requirements

### Requirement: Runtime log pipeline MUST persist logs through runtime persistence files

The runtime log pipeline MUST use runtime persistence files as the durable storage path for retained log documents after migration from prefs.

#### Scenario: Runtime log flush writes file storage

- **WHEN** retained runtime logs are flushed for persistence
- **THEN** the runtime log document SHALL be written through runtime persistence file storage
- **AND** the legacy `runtimeLogsJson` pref SHALL NOT remain the primary stored copy.

#### Scenario: Legacy prefs data is migrated

- **WHEN** runtime log hydration finds no runtime log file but finds legacy `runtimeLogsJson` pref data
- **THEN** the pipeline SHALL hydrate retained logs from the pref data
- **AND** persistence SHALL write the migrated document to runtime persistence file storage.

#### Scenario: Log listing does not require prefs storage

- **WHEN** runtime logs have been flushed to runtime persistence files
- **THEN** log listing and diagnostic bundle creation SHALL read the retained in-memory or file-backed log state
- **AND** they SHALL NOT require `runtimeLogsJson` to contain the retained entries.
