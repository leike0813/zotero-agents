# runtime-persistence-governance Specification

## Purpose
TBD - created by archiving change govern-runtime-persistence-directories. Update Purpose after archive.
## Requirements
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
- **AND** ACP Chat SHALL reserve `<runtime-root>/acp/chat/workspace` as the shared agent working directory and `<runtime-root>/acp/chat/conversations` as private per-conversation storage.
- **AND** ACP Chat private per-conversation storage SHALL NOT live inside `<runtime-root>/acp/chat/workspace`.

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

### Requirement: Integrity scans report indexed file mismatches

The plugin SHALL provide a report-first integrity scan for SQLite-indexed file
assets.

#### Scenario: Missing file is reported

- **WHEN** a SQLite row references a file path that does not exist
- **THEN** the scan SHALL report `missing_file_for_db_row`
- **AND** it SHALL NOT delete the row automatically.

#### Scenario: Orphan file is reported

- **WHEN** a runtime file asset is not referenced by any owning SQLite row
- **THEN** the scan SHALL report `orphan_file_without_db_row`
- **AND** it SHALL mark cleanup eligibility according to the runtime TTL policy.

#### Scenario: Cleanup is explicit

- **WHEN** cleanup is requested
- **THEN** dry-run SHALL be the default
- **AND** explicit cleanup SHALL delete only eligible runtime/cache/tmp/orphan
  workflow product assets
- **AND** it SHALL NOT delete `data/synthesis` or `state/zotero-agents.db`.

### Requirement: Durable data is excluded from runtime cleanup

Durable plugin data SHALL live outside cleanable runtime categories.

#### Scenario: Preferences monitor preserves durable data

- **WHEN** a user runs cleanup from the preferences storage monitor
- **THEN** the action SHALL NOT delete `data/synthesis`
- **AND** it SHALL NOT delete `state/zotero-agents.db`
- **AND** non-cleanable legacy or forbidden-location issues SHALL remain
  diagnostic-only.

### Requirement: Managed relative paths are governed

Runtime persistence SHALL provide a managed relative path policy for
plugin-generated paths under managed roots.

#### Scenario: Unsafe relative path is rejected

- **WHEN** a managed relative path contains traversal, an absolute path form, a
  reserved device name, a trailing dot or space, illegal characters, an
  over-budget segment, or an over-budget relative path
- **THEN** validation SHALL fail with a structured path diagnostic code.

#### Scenario: Case collision is rejected

- **WHEN** two managed relative paths in the same directory differ only by case
- **THEN** validation SHALL fail with `managed_path_case_collision`.

### Requirement: Long absolute managed paths are diagnostic warnings

Managed absolute path length SHALL be reported but not rejected by default.

#### Scenario: User root is long

- **WHEN** a user-selected managed root is long but the managed relative path is
  valid and short
- **THEN** the plugin SHALL NOT reject the path solely due to absolute length
- **AND** it MAY report `managed_absolute_path_long` as a warning diagnostic.

### Requirement: Integrity scan reports path policy issues

Persistence integrity scans SHALL report path-policy issues for managed plugin
assets.

#### Scenario: Managed asset violates policy

- **WHEN** a managed file under plugin-owned roots has a reserved name, case
  collision, legacy long canonical filename, or over-budget relative path
- **THEN** the integrity report SHALL include a non-cleanable diagnostic issue.

### Requirement: One-shot migration is explicit

Legacy persistence migration SHALL be available only through an explicit
one-shot script.

#### Scenario: Startup does not auto-migrate legacy roots

- **WHEN** the plugin starts and legacy `zotero-skills` or runtime roots exist
- **THEN** it SHALL NOT automatically migrate or read those legacy roots.

#### Scenario: Migration dry-run is non-mutating

- **WHEN** the one-shot migration script runs in dry-run mode
- **THEN** it SHALL report source assets, target paths, conflicts, and expected
  writes
- **AND** it SHALL NOT write target files.

