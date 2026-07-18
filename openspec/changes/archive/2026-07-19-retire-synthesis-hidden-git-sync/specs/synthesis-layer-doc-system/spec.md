## REMOVED Requirements

### Requirement: Synthesis docs define Git Sync durable-state exchange

**Reason**: The hidden Git Sync transport is removed completely and active
documentation must describe current state only.

**Migration**: Document WebDAV as the sole durable-sync transport.

### Requirement: Synthesis docs describe Git Sync configuration and conflict approval

**Reason**: Git preferences, credentials, commands, and conflict surfaces are
deleted with the never-released runtime.

**Migration**: Keep WebDAV Preferences, runtime state, and conflict approval
documentation only.

## MODIFIED Requirements

### Requirement: Synthesis docs describe WebDAV durable bundle sync

Active Synthesis documentation SHALL describe WebDAV Sync as the only durable
bundle transport and SHALL contain no Git Sync history, compatibility, or
retirement narrative.

#### Scenario: Developer reads WebDAV sync docs

- **WHEN** docs discuss durable synchronization
- **THEN** they SHALL state that Preferences and Synthesis Home expose WebDAV
  Sync
- **AND** they SHALL describe canonical autosync, bounded retry, conflict gates,
  and lifecycle cancellation as WebDAV current state only.

