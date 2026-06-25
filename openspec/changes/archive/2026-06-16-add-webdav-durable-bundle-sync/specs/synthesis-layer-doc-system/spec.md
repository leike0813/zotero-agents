## ADDED Requirements

### Requirement: Synthesis docs describe WebDAV durable bundle sync

Active Synthesis documentation SHALL describe WebDAV Sync as a lightweight durable bundle transport and distinguish it from live SQLite synchronization.

#### Scenario: Developer reads sync documentation
- **WHEN** docs discuss WebDAV Sync
- **THEN** they SHALL state that SQLite remains local
- **AND** only durable bundles, manifests, and HEAD pointers are exchanged.
