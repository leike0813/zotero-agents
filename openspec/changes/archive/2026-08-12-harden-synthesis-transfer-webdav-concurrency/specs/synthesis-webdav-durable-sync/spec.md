## MODIFIED Requirements

### Requirement: WebDAV automatic retries are bounded

Each explicit or autosync trigger SHALL schedule at most four automatic retry attempts for retryable failures at 60 seconds, 5 minutes, 15 minutes, and 30 minutes when the current Host description has `autoRetryEnabled: true`. Each wait SHALL remain interruptible by its generation owner.

#### Scenario: Retryable failures continue

- **WHEN** a triggered run repeatedly returns a retryable failure
- **THEN** WebDAV Sync SHALL schedule no more than four automatic retries
- **AND** SHALL use the ordered delays `60s`, `5m`, `15m`, and `30m` without truncation.

#### Scenario: Retry wait is canceled

- **WHEN** pause, a superseding trigger, abort, or shutdown cancels the active retry generation
- **THEN** the wait SHALL wake promptly and return without another Host operation.

#### Scenario: Automatic retry is disabled

- **WHEN** a run fails retryably and `autoRetryEnabled` is false
- **THEN** no automatic retry timer SHALL be armed.

#### Scenario: Plugin starts with persisted retry metadata

- **WHEN** a service starts and stored sync state describes an old retry
- **THEN** the service SHALL NOT recreate the hidden retry timer.

### Requirement: WebDAV timer work respects runtime gates

WebDAV durable state transitions SHALL serialize each complete load-normalize-patch-save operation. Pending autosync debounce and retry callbacks SHALL be canceled by pause, disablement, conflict, terminal failure, a superseding explicit trigger, or composition invalidation. A sync terminal racing a control mutation SHALL preserve the latest control state.

#### Scenario: Pause races with active sync completion

- **WHEN** pause persists while an admitted sync is in Host or durable work
- **THEN** the final durable state SHALL remain paused
- **AND** the completed run SHALL NOT arm a later automatic retry.

#### Scenario: Sync becomes paused or conflict-blocked

- **WHEN** a pending automatic callback exists and WebDAV Sync becomes paused or `blocked_conflict`
- **THEN** the callback SHALL be canceled
- **AND** it SHALL perform no remote operation.

#### Scenario: Composition is invalidated

- **WHEN** the production Synthesis composition is invalidated
- **THEN** its runtime abort signal SHALL cancel every pending debounce and retry callback before a replacement service is used.
