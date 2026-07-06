## ADDED Requirements

### Requirement: Host Bridge notification inbox reads the Notification Hub

Host Bridge notification list and wait operations SHALL read the bounded Notification Hub queue and SHALL NOT scan workflow, task, skill-run, or history stores while serving the read.

#### Scenario: Agent lists notifications

- **WHEN** a Host Bridge client calls `GET /bridge/v1/notifications`
- **THEN** the response SHALL be computed from retained Notification Hub events
- **AND** the read SHALL NOT trigger task, workflow, skill-run, or history projection.

### Requirement: Host Bridge notification results hide suppressed duplicates by default

Host Bridge notification list and wait operations SHALL exclude Hub events marked `suppressed: true` unless the caller explicitly requests suppressed events.

#### Scenario: Default list hides suppressed event

- **WHEN** a Hub event is marked `suppressed: true`
- **AND** a Host Bridge client calls `GET /bridge/v1/notifications` without an explicit suppressed-event option
- **THEN** the suppressed event SHALL NOT appear in the returned notifications.

### Requirement: Host Bridge notification clients use best-effort cursors

Host Bridge notification list and ack operations SHALL accept an optional `clientId`; list SHALL advance that client's delivered cursor after returning notifications, while ack SHALL remain independent of cursor advancement.

#### Scenario: Client list advances cursor

- **WHEN** a Host Bridge client calls `GET /bridge/v1/notifications?clientId=client-a`
- **THEN** returned events SHALL advance the delivered cursor for `client-a`
- **AND** a later list call for `client-a` SHALL NOT return the same retained events again.

#### Scenario: Another client can still read

- **WHEN** `client-a` has already listed an event
- **AND** `client-b` lists notifications
- **THEN** `client-b` SHALL still be able to receive that retained event.
