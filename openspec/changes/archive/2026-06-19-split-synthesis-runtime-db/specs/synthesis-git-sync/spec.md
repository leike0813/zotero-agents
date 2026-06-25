## ADDED Requirements

### Requirement: Synthesis live SQLite files SHALL remain local-only

Git Sync SHALL treat live SQLite files as local materialized state and SHALL NOT synchronize them.

#### Scenario: Durable bundle export runs

- **WHEN** Synthesis exports a durable Git/WebDAV bundle
- **THEN** `zotero-agents.db`, `synthesis.db`, WAL files, SHM files, operation rows, cache basis rows, graph cache rows, layout rows, metrics rows, logs, locks, credentials, and temp workspaces SHALL remain local-only.
