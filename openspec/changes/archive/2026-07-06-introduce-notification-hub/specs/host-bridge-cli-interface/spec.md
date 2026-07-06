## ADDED Requirements

### Requirement: CLI notification commands support client cursors

The CLI SHALL expose `--client-id` on `run notification list`, `run notification wait`, and `run notification ack` while preserving single JSON stdout.

#### Scenario: Agent lists with a client id

- **WHEN** a user or agent runs `zotero-bridge run notification list --client-id agent-a`
- **THEN** the CLI SHALL call `GET /bridge/v1/notifications` with `clientId=agent-a`.

#### Scenario: Agent waits with a client id

- **WHEN** a user or agent runs `zotero-bridge run notification wait --client-id agent-a`
- **THEN** each poll SHALL include `clientId=agent-a`.

#### Scenario: Agent acknowledges with a client id

- **WHEN** a user or agent runs `zotero-bridge run notification ack --client-id agent-a --event <eventId>`
- **THEN** the CLI SHALL call `POST /bridge/v1/notifications/ack` with `clientId=agent-a` and the normalized event ids.
