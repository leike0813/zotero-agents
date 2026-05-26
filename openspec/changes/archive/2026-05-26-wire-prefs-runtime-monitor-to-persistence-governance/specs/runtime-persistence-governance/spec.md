## ADDED Requirements

### Requirement: Integrity scans report indexed file mismatches

The plugin SHALL provide a report-first integrity scan for SQLite-indexed file
assets.

#### Scenario: Preferences scan returns governance data

- **WHEN** the preferences storage monitor is rescanned
- **THEN** it SHALL return the managed persistence root, runtime usage
  categories, and persistence integrity issues
- **AND** the scan SHALL NOT mutate runtime assets, SQLite rows, or durable
  Synthesis data.

#### Scenario: Preferences cleanup is issue-based

- **WHEN** the preferences storage monitor offers cleanup
- **THEN** cleanup SHALL be offered only for integrity issues marked
  `eligibleForCleanup`
- **AND** dry-run SHALL be the default cleanup mode
- **AND** explicit cleanup SHALL target issue ids rather than broad runtime
  categories.

#### Scenario: Durable data is protected in preferences

- **WHEN** the preferences storage monitor renders `data/synthesis` or
  `state/zotero-agents.db`
- **THEN** it SHALL treat those paths as diagnostic-only
- **AND** it SHALL NOT expose an action that deletes them.

### Requirement: Durable data is excluded from runtime cleanup

Durable plugin data SHALL live outside cleanable runtime categories.

#### Scenario: Preferences monitor preserves durable data

- **WHEN** a user runs cleanup from the preferences storage monitor
- **THEN** the action SHALL NOT delete `data/synthesis`
- **AND** it SHALL NOT delete `state/zotero-agents.db`
- **AND** non-cleanable legacy or forbidden-location issues SHALL remain
  diagnostic-only.
