## ADDED Requirements

### Requirement: Runtime persistence root
Runtime data that can grow over time SHALL be stored under a single managed runtime persistence root.

#### Scenario: Platform root is resolved
- **WHEN** the plugin resolves runtime persistence paths
- **THEN** it SHALL prefer `%LOCALAPPDATA%\Zotero-Skills\runtime` on Windows
- **AND** `~/Library/Application Support/Zotero-Skills/runtime` on macOS
- **AND** `${XDG_DATA_HOME:-~/.local/share}/Zotero-Skills/runtime` on Linux
- **AND** fall back to `<cwd>/.zotero-skills-runtime` only when no platform app-data path is available.

#### Scenario: Runtime subdirectories are named
- **WHEN** a module needs runtime storage
- **THEN** it SHALL use the central resolver
- **AND** it SHALL use semantic subdirectories for `state`, `logs`, `acp/chat`, `acp/skill-runs`, `cache`, `tmp`, and `legacy`.

### Requirement: Settings and user assets are excluded
Runtime persistence governance SHALL NOT include plugin settings or user-owned skill/workflow assets.

#### Scenario: Cleanup scan excludes user assets
- **WHEN** the preferences UI scans runtime usage
- **THEN** it SHALL NOT report `skills`, `skills_builtin`, `workflows`, or `workflows_builtin` as cleanup categories.

### Requirement: Safe migration
Existing runtime records SHALL migrate safely without startup deletion.

#### Scenario: State DB migration
- **WHEN** the new state DB is missing and the legacy Zotero data state DB exists
- **THEN** the plugin SHALL copy the legacy DB to the new managed `state` path
- **AND** it SHALL leave the legacy DB in place.

#### Scenario: Runtime log migration
- **WHEN** legacy `runtimeLogsJson` contains log entries
- **THEN** the plugin SHALL import them into managed log persistence
- **AND** future runtime log writes SHALL NOT rewrite the growing pref.

### Requirement: Preferences monitoring and cleanup
The preferences UI SHALL expose runtime storage usage and category cleanup.

#### Scenario: Usage display
- **WHEN** preferences are loaded or the user rescans
- **THEN** the UI SHALL show runtime root, total size, category sizes, and last scan time.

#### Scenario: Category cleanup
- **WHEN** the user triggers cleanup for a category
- **THEN** the UI SHALL ask for confirmation
- **AND** cleanup SHALL only remove rows/files owned by that category.
