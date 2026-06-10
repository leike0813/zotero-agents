# acp-chat-session-management Specification

## Purpose
TBD - created by archiving change add-acp-chat-session-management. Update Purpose after archive.
## Requirements
### Requirement: ACP chat stores multiple local sessions per backend


The system SHALL allow each ACP backend to maintain multiple local chat sessions with one active session.

#### Scenario: User creates a new conversation

- **WHEN** the user chooses New Conversation
- **THEN** a new local chat session MUST be created for the active backend
- **AND** existing sessions for that backend MUST remain available.
### Requirement: ACP chat can switch active session


The system SHALL switch the visible transcript and command target when the active chat session changes.

#### Scenario: User selects another session

- **WHEN** the user selects a different chat session
- **THEN** the active snapshot, transcript, diagnostics, and workspace metadata MUST reflect that session
- **AND** subsequent chat actions MUST target that session.
### Requirement: Remote session attachments are not durable


The system SHALL restore local chat state without assuming a stored remote ACP session id is valid.

#### Scenario: Stored session is restored or selected

- **WHEN** a stored local session becomes active after restart or switch
- **THEN** its local transcript and UI state MUST be restored
- **AND** the remote `sessionId` MUST be cleared before reconnecting
- **AND** the next reconnect or prompt MUST create a new remote ACP session.
### Requirement: Busy sessions cannot be switched or deleted


The system SHALL prevent unsafe local session changes while the active session has an in-flight prompt or permission request.

#### Scenario: Session is prompting

- **WHEN** the active session status is `prompting` or `permission-required`
- **THEN** switching sessions and deleting the active session MUST be rejected or disabled.
### Requirement: Session deletion selects a safe fallback


The system SHALL maintain an active session after deleting the current session.

#### Scenario: User deletes the active session

- **WHEN** the active session is deleted
- **THEN** the most recently updated remaining session for the backend SHOULD become active
- **AND** if no session remains, a new empty session MUST be created.
### Requirement: Legacy conversation storage is migrated


The system SHALL migrate previous single-conversation ACP storage into the multi-session model.

#### Scenario: Legacy conversation exists

- **WHEN** the system reads ACP chat sessions for a backend with legacy `conversation:<backendId>` storage
- **THEN** it MUST create a default local session containing the legacy transcript
- **AND** it MUST remove the legacy storage after successful migration.
### Requirement: ACP sidebar exposes session controls


The ACP sidebar SHALL expose the active backend's chat session list and session management actions.

#### Scenario: Sidebar renders chat controls

- **WHEN** the ACP sidebar receives a frontend snapshot
- **THEN** it MUST render a session selector for the active backend
- **AND** it MUST provide actions to create, rename, and delete chat sessions.
### Requirement: ACP Chat exposes Host Bridge guidance through wrapper skill


ACP Chat SHALL keep Host Bridge runtime access available while avoiding direct
Host Bridge prompt injection.

#### Scenario: Chat materializes wrapper skill for project skill roots

- **GIVEN** an ACP Chat backend resolves to one or more project skill roots
- **WHEN** the ACP Chat adapter is created
- **THEN** the chat workspace SHALL receive the `zotero-bridge-cli` wrapper
  skill in those skill roots
- **AND** user chat prompts sent to the ACP adapter SHALL remain the original
  user message without appended Host Bridge guidance.

#### Scenario: Chat backend has no project skill roots

- **GIVEN** an ACP Chat backend resolves to no project skill roots
- **WHEN** the ACP Chat adapter is created
- **THEN** the system SHALL record a diagnostic that the Host Bridge wrapper
  skill was not materialized
- **AND** it SHALL NOT fall back to direct Host Bridge prompt injection.
