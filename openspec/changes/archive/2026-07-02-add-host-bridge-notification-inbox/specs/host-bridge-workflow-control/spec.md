## ADDED Requirements

### Requirement: Host Bridge exposes a notification inbox

Host Bridge SHALL expose a lightweight notification inbox for workflow and
skill-run runtime events.

#### Scenario: Client lists notification events

- **WHEN** an authenticated client requests `GET /bridge/v1/notifications`
- **THEN** the bridge SHALL return lightweight notification events
- **AND** each event SHALL include `eventId`, `createdAt`, `type`, `summary`,
  `relatedHandles`, and nullable `acknowledgedAt`
- **AND** events MAY include workflow run id, skill run id, workflow id, task
  name, state, liveness, and action flags when known
- **AND** events MUST NOT include transcripts, local workspace paths, full error
  text, provider-private payloads, tokens, or raw request/response bodies.

#### Scenario: Client filters notification events

- **WHEN** a client supplies workflow run id, skill run id, type,
  since event id, acknowledged state, or limit filters
- **THEN** the bridge SHALL return only matching lightweight events
- **AND** it SHALL include a next since-event marker when more events may be
  queried later.

#### Scenario: Client acknowledges notification events

- **WHEN** a client posts one or more event ids to
  `POST /bridge/v1/notifications/ack`
- **THEN** the bridge SHALL mark known events acknowledged
- **AND** it SHALL return acknowledged ids, missing ids, and the acknowledgement
  timestamp
- **AND** acknowledgement SHALL NOT delete the event.

#### Scenario: Runtime state projects notification events

- **WHEN** workflow/task/skill-run state indicates running, waiting, terminal,
  or recoverable failure transitions
- **THEN** the inbox SHALL expose corresponding workflow or skill-run
  notification events without requiring transcript access.
