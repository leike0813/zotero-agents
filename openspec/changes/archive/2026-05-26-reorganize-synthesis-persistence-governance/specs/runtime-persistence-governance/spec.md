## MODIFIED Requirements

### Requirement: Runtime persistence root

Runtime data that can grow over time SHALL be stored under a managed
DataDirectory-scoped plugin persistence root when Zotero `DataDirectory` is
available.

#### Scenario: Production root is scoped to Zotero DataDirectory

- **WHEN** the plugin resolves persistence paths in a Zotero runtime with
  `Zotero.DataDirectory.dir`
- **THEN** the root SHALL be `<Zotero.DataDirectory.dir>/zotero-agents`
- **AND** the SQLite state database SHALL be `state/zotero-agents.db`
- **AND** cleanable runtime data SHALL live under `runtime/`.

#### Scenario: Runtime subdirectories are named

- **WHEN** a module needs runtime storage
- **THEN** it SHALL use the central resolver
- **AND** it SHALL use semantic subdirectories for `runtime/logs`,
  `runtime/acp/chat`, `runtime/acp/skill-runs`, `runtime/cache`, and
  `runtime/tmp`.
- **AND** ACP Chat SHALL reserve `runtime/acp/chat/workspace` as the shared
  agent working directory and `runtime/acp/chat/conversations` as private
  per-conversation storage.
- **AND** ACP Chat private per-conversation storage SHALL NOT live inside
  `runtime/acp/chat/workspace`.

## MODIFIED Requirements

### Requirement: Durable data is excluded from runtime cleanup

Durable plugin data SHALL live outside cleanable runtime categories.

#### Scenario: Synthesis canonical store is durable

- **WHEN** Synthesis canonical assets are written by the default service
- **THEN** they SHALL be written under `data/synthesis`
- **AND** runtime cleanup SHALL NOT remove `data/synthesis`.

#### Scenario: Cleanup scan excludes durable and user assets

- **WHEN** the preferences UI scans runtime usage
- **THEN** it SHALL NOT report durable `data/`, `skills`, `skills_builtin`,
  `workflows`, or `workflows_builtin` as cleanup categories.

## ADDED Requirements

### Requirement: Persistence ownership is governed

The plugin SHALL document and enforce coarse ownership boundaries for prefs,
SQLite indexed state, and file assets.

#### Scenario: Prefs are lightweight

- **WHEN** persistent configuration is stored
- **THEN** prefs SHALL be limited to configuration, feature flags, small
  switches, encrypted token envelopes, and migration markers
- **AND** prefs SHALL NOT store Synthesis canonical payloads.

#### Scenario: SQLite owns indexes

- **WHEN** operational rows are persisted
- **THEN** `zotero-agents.db` SHALL store indexed task, request, queue, job,
  conversation, and workflow product metadata
- **AND** large payload files SHALL be referenced as file assets rather than
  embedded as growing SQLite blobs.

## MODIFIED Requirements

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

## ADDED Requirements

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
