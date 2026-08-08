# synthesis-citation-graph-build-large-transfer-contract Specification

## Purpose

Define bounded staging, expiry, restart, and retry behavior for large native Citation Graph transfers.

## Requirements

### Requirement: Native transfer staging SHALL enforce aggregate storage bounds

The native service SHALL allow at most two sessions, 4 MiB per page, 1 GiB per direction per session, and 2 GiB of total staged transfer bytes.

#### Scenario: Service total would exceed its bound
- **WHEN** accepting a valid page would exceed 2 GiB across active sessions
- **THEN** the action SHALL fail with `transfer_limit_exceeded`
- **AND** no partial page SHALL remain

### Requirement: Native transfer sessions SHALL expire and reap predictably

Sessions SHALL expire after five minutes idle or thirty minutes absolute lifetime, and the service SHALL perform bounded reaping no more frequently than every thirty seconds.

#### Scenario: Idle session is reaped
- **WHEN** a session has no activity for five minutes
- **THEN** its files and idempotency reservation SHALL be removed

#### Scenario: Active lifetime reaches the absolute limit
- **WHEN** a session reaches thirty minutes from creation
- **THEN** it SHALL be canceled and removed even if recently accessed

### Requirement: Native restart and retry SHALL preserve external lifecycle semantics

Retryable worker or sink failures SHALL return a session to `input_sealed` with structured last failure, while restart SHALL discard all sessions.

#### Scenario: Attempt fails after partial output
- **WHEN** a worker or sink fault occurs during publication
- **THEN** status SHALL expose the stable failure and permit explicit retry
- **AND** no output SHALL be readable before a later successful commit

#### Scenario: Service closes and reopens
- **WHEN** a client queries a session created by the prior process
- **THEN** the service SHALL return `transfer_not_found`
