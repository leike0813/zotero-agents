## ADDED Requirements

### Requirement: Workbench exposes manual WebDAV Sync

Workbench SHALL show WebDAV Sync runtime status and a manual Sync now action when WebDAV Sync is configured.

#### Scenario: WebDAV Sync is not configured
- **WHEN** WebDAV Sync preferences are incomplete
- **THEN** Workbench SHALL show the configuration status and offer Preferences as the setup path.

#### Scenario: User triggers WebDAV Sync
- **WHEN** the user clicks WebDAV Sync now
- **THEN** Workbench SHALL route the command through the Synthesis service
- **AND** it SHALL NOT trigger Git Sync as part of that command.
