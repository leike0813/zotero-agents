# acp-chat-session-management Delta

## MODIFIED Requirements

### Requirement: ACP chat stores multiple local sessions per backend

ACP Chat SHALL treat each local chat session as an independent runtime unit under its backend.

#### Scenario: User creates a new conversation while another session is prompting

- **GIVEN** an ACP Chat session under a backend is `prompting`
- **WHEN** the user chooses New Conversation for the same backend
- **THEN** a new local session SHALL be created and selected
- **AND** the prompting session SHALL remain connected and continue running.

### Requirement: ACP chat can switch active session

Switching the active session SHALL change the foreground UI target only. It SHALL NOT disconnect, cancel, or mutate the previously active session.

#### Scenario: User selects another session while the current session is prompting

- **GIVEN** the current foreground ACP Chat session is `prompting`
- **WHEN** the user selects another session
- **THEN** the foreground snapshot SHALL switch to that session immediately
- **AND** the prompting session SHALL continue in the background.

### Requirement: ACP sidebar exposes session controls

ACP Chat host actions SHALL include `backendId` and `conversationId` for session-scoped operations.

#### Scenario: User disconnects a background session

- **WHEN** the user triggers disconnect for a session row
- **THEN** only that session SHALL disconnect
- **AND** other sessions for the same backend SHALL keep their state.

## REMOVED Requirements

### Requirement: Busy sessions cannot be switched or deleted

This requirement is removed. Prompting sessions no longer block selecting or creating other sessions. Archive/delete remains restricted to idle disconnected sessions.

## ADDED Requirements

### Requirement: ACP Chat sessions own connection state

Each ACP Chat session SHALL independently own its live adapter, remote runtime session id, permission request, diagnostics, status, and transcript mirror.

#### Scenario: Same backend has two connected sessions

- **GIVEN** two local sessions exist for the same ACP backend
- **WHEN** both sessions are connected
- **THEN** each session SHALL retain its own adapter and `sessionId`
- **AND** status updates from one session SHALL NOT overwrite the other session.

### Requirement: ACP Chat archives only disconnected sessions

ACP Chat SHALL allow archiving idle disconnected sessions and SHALL reject archiving connected or prompting sessions.

#### Scenario: User archives the foreground idle session

- **GIVEN** the foreground session is idle and disconnected
- **WHEN** the user archives it
- **THEN** the session SHALL be hidden from visible session lists
- **AND** the foreground selection SHALL move to the most recently updated visible session or an empty placeholder.

### Requirement: ACP Chat live adapter cap is session-scoped

ACP Chat SHALL keep at most three live ACP Chat adapters across all sessions.

#### Scenario: Fourth live session evicts idle live session

- **GIVEN** three ACP Chat sessions have live adapters
- **AND** at least one live adapter is idle
- **WHEN** another session connects
- **THEN** the least recently used idle live session SHALL be disconnected
- **AND** the new session MAY connect.

#### Scenario: All live sessions are busy

- **GIVEN** three ACP Chat sessions are prompting or waiting on permission
- **WHEN** another session connects
- **THEN** the new connection SHALL be rejected
- **AND** existing sessions SHALL remain unchanged.
