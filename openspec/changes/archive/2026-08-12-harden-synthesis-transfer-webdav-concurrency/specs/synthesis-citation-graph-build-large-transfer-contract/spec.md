## MODIFIED Requirements

### Requirement: Native transfer sessions SHALL expire and reap predictably

Sessions SHALL expire after five minutes idle or thirty minutes absolute lifetime, and the service SHALL perform bounded reaping no more frequently than every thirty seconds. A queued, executing, or publishing attempt SHALL pin its session against idle reaping. Absolute expiry, explicit cancellation, and shutdown SHALL revoke external access immediately but SHALL defer physical file and byte cleanup until the active attempt returns ownership.

#### Scenario: Idle inactive session is reaped

- **WHEN** an inactive session has no activity for five minutes
- **THEN** its files, idempotency reservation, and staged-byte reservation SHALL be removed exactly once.

#### Scenario: Active session reaches a cleanup boundary

- **WHEN** an active attempt reaches absolute expiry, is canceled, or observes shutdown
- **THEN** the attempt SHALL be canceled and the session SHALL no longer be externally accessible
- **AND** its files and bytes SHALL remain owned until the attempt drains.

### Requirement: Native transfer staging SHALL enforce aggregate storage bounds

The native service SHALL allow at most two visible sessions, 4 MiB per page, 1 GiB per direction per session, and 2 GiB of total staged transfer bytes. Every accepted byte SHALL have one typed owner and SHALL be released exactly once on rollback, adoption cleanup, cancellation, reap, or stop.

#### Scenario: Service total would exceed its bound

- **WHEN** accepting a valid page would exceed 2 GiB across active sessions
- **THEN** the action SHALL fail with `transfer_limit_exceeded`
- **AND** no partial page SHALL remain

#### Scenario: Output publication transfers ownership

- **WHEN** a sink commits staged output and the session adopts its publication
- **THEN** the reservation SHALL move from the sink to the session without changing the aggregate count
- **AND** later session cleanup SHALL return the count to its prior value without underflow.
