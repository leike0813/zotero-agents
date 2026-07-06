## ADDED Requirements

### Requirement: Notification Hub retains bounded in-memory events

The system SHALL keep short notification events in a process-local FIFO queue with a configured maximum event count, without TTL cleanup, timers, or persistent storage.

#### Scenario: FIFO retention

- **WHEN** appending more events than the configured maximum
- **THEN** the Hub SHALL retain the newest events up to the maximum
- **AND** the Hub SHALL discard older events in FIFO order.

### Requirement: Notification Hub governs visible short toast delivery

The system SHALL append each short toast notification to the Hub before visible delivery and SHALL suppress duplicate visible toasts that share a display group within the Hub suppression window.

#### Scenario: Duplicate display group

- **WHEN** two short notifications from different owners use the same `displayGroupKey` inside the suppression window
- **THEN** the Hub SHALL mark the later event as `suppressed: true`
- **AND** only the first event SHALL be delivered to the Zotero visible toast sink.

### Requirement: Notification Hub supports independent best-effort clients

The system SHALL support optional `clientId` cursors so each Host Bridge client can list each retained notification once without preventing other clients from reading the same event.

#### Scenario: Multiple clients list the same retained event

- **WHEN** client A lists notifications with `clientId=a`
- **AND** client B lists notifications with `clientId=b`
- **THEN** both clients SHALL be able to receive the same retained event once.

#### Scenario: Client cursor advances on list

- **WHEN** a client lists notifications with `clientId`
- **THEN** the Hub SHALL advance that client's delivered cursor to the last returned event.

### Requirement: Notification Hub reports truncation

The system SHALL report `truncated: true` when a supplied cursor or since marker is not present in the retained FIFO queue.

#### Scenario: Cursor marker is missing

- **WHEN** a Host Bridge client lists notifications after its cursor marker has fallen out of the retained queue
- **THEN** the response SHALL include `truncated: true`
- **AND** listing SHALL continue from the retained queue boundary.
