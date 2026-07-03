## MODIFIED Requirements

### Requirement: ACP Chat transcript state is file-backed

ACP Chat SHALL store user-facing conversation transcripts as JSONL files under the conversation storage directory and SHALL use a bounded in-memory transcript mirror only for connected active conversations and the foreground conversation.

#### Scenario: New chat conversation stores metadata-only database payload

- **WHEN** ACP Chat persists a conversation
- **THEN** the database request payload SHALL contain only metadata, paths, counters, revisions, timestamps, and bounded previews
- **AND** it SHALL NOT contain complete transcript items
- **AND** `plugin_task_rows` SHALL NOT contain ACP Chat transcript item payloads.

#### Scenario: Foreground chat snapshot carries transcript mirror

- **GIVEN** an ACP Chat conversation is the foreground conversation
- **WHEN** the ACP Chat UI snapshot is published
- **THEN** the snapshot SHALL carry the current transcript mirror in `items` when ready
- **AND** the front-end SHALL render those items directly without requesting transcript pages or applying transcript deltas.

#### Scenario: Streaming chat text updates memory before persistence

- **WHEN** assistant or thought streaming chunks arrive
- **THEN** the session manager SHALL fold the transcript event into the memory mirror before notifying UI listeners
- **AND** JSONL persistence SHALL remain asynchronous durable storage.

#### Scenario: Cold foreground conversation hydrates without blocking selection

- **GIVEN** a stored ACP Chat conversation has no loaded transcript mirror
- **WHEN** it is selected as the foreground conversation
- **THEN** the session manager SHALL publish session metadata immediately
- **AND** `transcriptState.state` SHALL be `"loading"` until JSONL hydrate completes
- **AND** a later snapshot SHALL carry hydrated `items`.

### Requirement: ACP Chat no longer uses transcript page or delta UI protocol

ACP Chat SHALL NOT use the removed transcript page/delta protocol for Assistant Workspace rendering.

#### Scenario: Page delta protocol is absent

- **WHEN** the ACP Chat front-end needs transcript content
- **THEN** it SHALL consume only the current foreground snapshot
- **AND** it SHALL NOT send `load-chat-transcript-page`
- **AND** the host SHALL NOT send ACP Chat `transcript-page` or `transcript-delta` child snapshots.
