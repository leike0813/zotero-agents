# synthesis-layer-doc-system Delta

## MODIFIED Requirements

### Requirement: Synthesis docs define Git Sync durable-state exchange

Active Synthesis docs SHALL describe Git Sync as a retained deprecated transport, not the current primary user-facing sync option.

#### Scenario: Developer reads sync docs

- **WHEN** docs discuss current user-visible sync
- **THEN** they SHALL identify WebDAV durable bundle sync as the visible manual sync transport
- **AND** they SHALL note that Git Sync code is retained but hidden/deprecated.

### Requirement: Synthesis docs describe WebDAV durable bundle sync

Active Synthesis documentation SHALL describe WebDAV Sync as the current visible manual durable bundle transport.

#### Scenario: Developer reads WebDAV sync docs

- **WHEN** docs discuss WebDAV Sync
- **THEN** they SHALL state that the Preferences and Synthesis Home UI expose WebDAV Sync only.
