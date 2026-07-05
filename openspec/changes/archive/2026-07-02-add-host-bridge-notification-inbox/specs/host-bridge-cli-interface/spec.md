## ADDED Requirements

### Requirement: Rust CLI exposes notification inbox commands

The CLI SHALL expose Host Bridge notification inbox operations under the
canonical `run notification` namespace while preserving single JSON stdout.

#### Scenario: Agent lists notification events

- **WHEN** a user or agent runs `zotero-bridge run notification list`
- **THEN** the CLI SHALL call `GET /bridge/v1/notifications`
- **AND** it SHALL support workflow run id, skill run id, type, since event id,
  acknowledged state, and limit filters.

#### Scenario: Agent waits for a notification event

- **WHEN** a user or agent runs `zotero-bridge run notification wait`
- **THEN** the CLI SHALL short-poll `GET /bridge/v1/notifications` until a
  matching event is returned or the timeout expires
- **AND** it SHALL NOT open a watch, stream, cursor, or webhook connection.

#### Scenario: Agent acknowledges notification events

- **WHEN** a user or agent runs
  `zotero-bridge run notification ack --event <eventId>`
- **THEN** the CLI SHALL post the event ids to
  `POST /bridge/v1/notifications/ack`
- **AND** multiple `--event` values SHALL acknowledge multiple events.
