# synthesis-sidecar-shutdown-drain Specification

## Purpose
Defines the synthesis sidecar shutdown drain capability for the Synthesis plugin, specifying its service boundary, integration contracts, and runtime behavior.

## Requirements

### Requirement: Topic application shutdown SHALL drain admitted work


The Topic application SHALL stop new apply admission and wait for every apply
admitted before shutdown to settle before its shutdown promise completes.

#### Scenario: Multiple applies are active during shutdown

- **WHEN** shutdown begins after multiple Topic applies have been admitted
- **THEN** later apply admission is rejected with the existing stopping result
- **AND** shutdown remains pending until every admitted apply has settled

#### Scenario: An admitted apply fails

- **WHEN** an admitted Topic apply rejects or returns a failure result while shutdown is draining
- **THEN** the application shutdown still settles after all other admitted work has settled

### Requirement: Service cleanup SHALL be failure-isolated


The service SHALL attempt every admission stop, application drain, owner close,
and terminal resource shutdown even when another cleanup step throws or rejects.

#### Scenario: One owner fails during runtime shutdown

- **WHEN** one cleanup owner fails after runtime shutdown begins
- **THEN** later owners are still asked to clean up
- **AND** the HTTP server closes or force-closes
- **AND** `runtime.stopped` resolves

#### Scenario: Cleanup failure is logged

- **WHEN** a cleanup step throws or rejects
- **THEN** the service records its cleanup phase, owner, and error type
- **AND** arbitrary error message content is not serialized

### Requirement: Listen rollback SHALL preserve the startup failure


Post-composition listen rollback SHALL use the same failure-isolated owner
cleanup and SHALL rethrow the original listen error after cleanup attempts.

#### Scenario: Listen and cleanup both fail

- **WHEN** the HTTP listener fails and a cleanup owner also fails
- **THEN** remaining owners are still asked to clean up
- **AND** startup rejects with the original listen error rather than the cleanup error
