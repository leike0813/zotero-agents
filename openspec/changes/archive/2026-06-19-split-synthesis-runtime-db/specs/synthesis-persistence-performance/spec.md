## ADDED Requirements

### Requirement: Synthesis runtime state is isolated in its own SQLite database

Synthesis SHALL use `state/synthesis.db` as the local SQLite source for sidecar cache rows, review state, user-approved decisions, and operation progress.

#### Scenario: Repository initializes

- **WHEN** the Synthesis repository initializes for a persistence root
- **THEN** it SHALL open `state/synthesis.db`
- **AND** it SHALL create or migrate Synthesis `synt_*` schema there.

#### Scenario: Legacy same-root Synthesis tables exist

- **WHEN** `state/synthesis.db` has no active Synthesis schema or rows
- **AND** the same root's `state/zotero-agents.db` contains legacy `synt_*` tables
- **THEN** initialization SHALL copy allowlisted Synthesis tables into `state/synthesis.db`
- **AND** it SHALL leave the legacy tables in `state/zotero-agents.db` untouched.

#### Scenario: Legacy migration source is absent

- **WHEN** no legacy `synt_*` tables exist in `state/zotero-agents.db`
- **THEN** initialization SHALL create a clean `state/synthesis.db`.

## MODIFIED Requirements

### Requirement: WebDAV sync excludes rebuildable projections

WebDAV Sync SHALL only upload durable bundle assets and SHALL exclude runtime state, cache, projection, SQLite, WAL, SHM, logs, locks, and temporary files.

#### Scenario: WebDAV export runs

- **WHEN** WebDAV Sync uploads a snapshot
- **THEN** uploaded paths SHALL be limited to `manifest.json` and `bundles/**` under a snapshot root plus the final `HEAD.json`
- **AND** it SHALL exclude `zotero-agents.db`, `synthesis.db`, and their WAL/SHM companion files.
