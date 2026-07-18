## REMOVED Requirements

### Requirement: Workbench surfaces durable Git Sync status

**Reason**: Git Sync state no longer exists in service or client snapshots.

**Migration**: Render only the WebDAV Sync projection.

### Requirement: Workbench presents Git Sync config and runtime status

**Reason**: Git Sync configuration and runtime are removed completely.

**Migration**: Use WebDAV Preferences and Home runtime controls.

## MODIFIED Requirements

### Requirement: Workbench exposes manual WebDAV Sync

Workbench SHALL show WebDAV Sync runtime status and a manual Sync now action
when WebDAV Sync is configured.

#### Scenario: WebDAV Sync is not configured

- **WHEN** WebDAV Sync preferences are incomplete
- **THEN** Workbench SHALL show the configuration status and offer Preferences
  as the setup path.

#### Scenario: User triggers WebDAV Sync

- **WHEN** the user clicks WebDAV Sync now
- **THEN** Workbench SHALL route the WebDAV command through the Synthesis client.

