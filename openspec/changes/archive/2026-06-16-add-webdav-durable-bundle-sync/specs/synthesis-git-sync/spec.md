## ADDED Requirements

### Requirement: WebDAV sync uses durable bundle snapshots

Synthesis SHALL provide an experimental WebDAV Sync transport that exchanges durable bundle snapshots and SHALL NOT synchronize the live SQLite database.

#### Scenario: WebDAV remote is empty
- **WHEN** WebDAV Sync cannot find `HEAD.json`
- **THEN** it SHALL treat the remote as initializable
- **AND** a manual sync SHALL upload a durable snapshot and then update `HEAD.json`.

#### Scenario: Remote changes during sync
- **WHEN** the remote HEAD changes between initial read and final update
- **THEN** WebDAV Sync SHALL stop without overwriting remote HEAD
- **AND** it SHALL report `webdav_sync_remote_changed_during_sync`.

#### Scenario: Durable validation fails
- **WHEN** a downloaded snapshot has invalid manifest, bundle, or entity hashes
- **THEN** WebDAV Sync SHALL reject the import
- **AND** it SHALL NOT write SQLite.
