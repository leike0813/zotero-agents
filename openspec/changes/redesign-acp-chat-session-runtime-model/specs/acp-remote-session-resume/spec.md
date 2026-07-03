# acp-remote-session-resume Delta

## MODIFIED Requirements

### Requirement: Capability-Gated Remote Restore

Remote restore SHALL be scoped to the selected local ACP Chat session. Each local session owns its persisted `remoteSessionId`.

#### Scenario: Session reconnects after disconnect

- **GIVEN** a local ACP Chat session is idle and has a persisted `remoteSessionId`
- **AND** its backend advertises resume or load support
- **WHEN** that session reconnects or sends a prompt
- **THEN** ACP Chat SHALL attempt resume or load for that session before `session/new`.

### Requirement: Migration

Migrated runtime `sessionId` values SHALL become `remoteSessionId` on the same local session. Switching foreground sessions SHALL NOT clear `remoteSessionId`.

#### Scenario: User switches away from disconnected session

- **GIVEN** an idle local session has `remoteSessionId`
- **WHEN** the user selects another session
- **THEN** the previous session SHALL retain its `remoteSessionId`
- **AND** later reconnect SHALL use the remote restore policy for that session.
