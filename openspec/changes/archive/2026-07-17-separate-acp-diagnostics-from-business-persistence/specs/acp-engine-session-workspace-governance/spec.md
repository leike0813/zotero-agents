## MODIFIED Requirements

### Requirement: ACP chat supports multiple local sessions per backend

The system SHALL allow each ACP backend to own multiple local chat sessions with one active chat session at a time. Current-process diagnostics SHALL remain isolated by the same backend and conversation owner.

#### Scenario: User switches chat sessions

- **WHEN** the user selects a different chat session for a backend
- **THEN** the visible transcript, current-process diagnostics, mode/model state, and send target MUST switch to that session
- **AND** other chat sessions for the backend MUST remain locally available
- **AND** diagnostics from one owner MUST NOT appear in another owner's presentation state.

### Requirement: Chat restart recovery is local-first

The system SHALL restore chat transcript and business UI state locally after plugin restart, but SHALL NOT treat remote ACP `sessionId` or transient diagnostic observations as durable SSOT.

#### Scenario: Plugin restarts with stored chat sessions

- **WHEN** the plugin starts after a previous ACP chat session
- **THEN** local chat transcript and business UI state MAY be restored
- **AND** diagnostic entries, diagnostic-derived stderr tail, and diagnostic-derived lifecycle observation MUST NOT be restored as conversation state
- **AND** the old remote ACP `sessionId` MUST NOT be assumed already attached
- **AND** reconnecting or sending a prompt MAY attempt remote restore only when the backend declares `session/resume` or `session/load`
- **AND** unsupported or failed restore MUST create a new remote ACP session.

### Requirement: Task sessions are archived outside free-form chat

The system SHALL keep ACP task sessions out of the free-form chat session list while preserving read-only auditability through canonical business history, request-scoped logs, and any already-materialized debug audit artifacts.

#### Scenario: ACP task session completes

- **WHEN** an ACP task session reaches terminal state
- **THEN** its transcript, result metadata, business lifecycle history, identifiers, request-scoped logs, and existing debug audit artifacts SHOULD remain with task history
- **AND** it SHOULD be openable as a read-only task transcript or diagnostic view
- **AND** adapter transport diagnostics MUST NOT be required as canonical task events
- **AND** it MUST NOT appear as a normal free-form chat session.

