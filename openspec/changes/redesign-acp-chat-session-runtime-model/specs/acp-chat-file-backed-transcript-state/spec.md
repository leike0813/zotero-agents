# acp-chat-file-backed-transcript-state Delta

## MODIFIED Requirements

### Requirement: ACP Chat transcript state is file-backed

ACP Chat transcript JSONL SHALL remain the durable source of truth. The selected session snapshot MAY carry full transcript items from the session runtime mirror for direct UI rendering.

#### Scenario: Foreground cold session hydrates asynchronously

- **GIVEN** an idle non-foreground session has durable transcript JSONL and no loaded mirror
- **WHEN** the user selects that session
- **THEN** the foreground snapshot SHALL switch immediately with `transcriptState.state = "loading"`
- **AND** a later snapshot SHALL include full transcript items after JSONL hydrate completes.

### Requirement: Streaming chat text uses a session mirror

Connected and prompting ACP Chat sessions SHALL fold transcript events into their own in-memory mirror before asynchronous JSONL persistence.

#### Scenario: Background prompting session streams text

- **GIVEN** a background session is prompting
- **WHEN** it receives text chunks
- **THEN** its session mirror SHALL update
- **AND** the foreground session transcript SHALL NOT be replaced.

## ADDED Requirements

### Requirement: ACP Chat releases only idle non-foreground mirrors

ACP Chat SHALL keep mirrors for all connected or prompting sessions and for the foreground session.

#### Scenario: Foreground session disconnects

- **GIVEN** the foreground session is connected and has a loaded mirror
- **WHEN** the user disconnects it
- **THEN** the session SHALL become idle
- **AND** its mirror SHALL remain loaded while it remains foreground
- **AND** no transcript loading state SHALL be shown solely because of disconnect.

#### Scenario: Idle disconnected session leaves foreground

- **GIVEN** an idle disconnected foreground session has a loaded mirror
- **WHEN** the user selects another session
- **THEN** the old session mirror MAY be released
- **AND** selecting it again SHALL hydrate from JSONL.
