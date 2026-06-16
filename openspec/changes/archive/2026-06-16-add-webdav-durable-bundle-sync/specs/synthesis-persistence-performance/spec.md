## ADDED Requirements

### Requirement: WebDAV sync excludes rebuildable projections

WebDAV Sync SHALL only upload durable bundle assets and SHALL exclude runtime state, cache, projection, SQLite, WAL, SHM, logs, locks, and temporary files.

#### Scenario: WebDAV export runs
- **WHEN** WebDAV Sync uploads a snapshot
- **THEN** uploaded paths SHALL be limited to `manifest.json` and `bundles/**` under a snapshot root plus the final `HEAD.json`.
