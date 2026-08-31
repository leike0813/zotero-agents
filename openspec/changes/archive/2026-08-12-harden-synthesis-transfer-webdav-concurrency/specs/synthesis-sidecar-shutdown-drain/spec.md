## MODIFIED Requirements

### Requirement: Native worker and transfer shutdown SHALL share the existing deadline

Shutdown SHALL stop HTTP, background-task, application, compute, and transfer admission; interrupt active sockets; cancel queued and active work; and drain HTTP handlers plus composition-owned transfer and public maintenance tasks within the existing 500 ms worker budget. Transfer staging and repository/canonical owners SHALL be released only after the work that references them drains.

#### Scenario: Shutdown begins with mixed work

- **WHEN** one paged transfer is active and two direct or paged operations are queued
- **THEN** every operation SHALL reach terminal cancellation
- **AND** no child or transfer attempt SHALL remain after shutdown

#### Scenario: Lease loss or stdin EOF stops the service

- **WHEN** either lifecycle signal ends the native process
- **THEN** the same pool, transfer, socket-interruption, and handler-drain cleanup path SHALL run
- **AND** no incomplete HTTP request SHALL keep the process alive

#### Scenario: Lifecycle shutdown responds before interruption

- **WHEN** a valid lifecycle request invokes `system.shutdown`
- **THEN** the server writes its success receipt before publishing the stopping signal
- **AND** it then interrupts all other active connections and begins bounded cleanup even if the receipt write fails

#### Scenario: Shutdown begins with a partial request

- **WHEN** a client keeps a request line or header incomplete while stdin EOF or lifecycle shutdown occurs
- **THEN** the server interrupts that socket without waiting for its read deadline
- **AND** the HTTP handler drains within the 500 ms bound without requiring the client to close first

#### Scenario: Shutdown begins with detached native work

- **WHEN** a transfer attempt or public maintenance controller is active
- **THEN** shutdown SHALL request its cancellation and join it within the shared deadline
- **AND** no task may retain transfer, repository, or canonical ownership after successful shutdown.

#### Scenario: Background drain misses the deadline

- **WHEN** a registered task does not return before the shared deadline
- **THEN** shutdown SHALL report a stable incomplete-drain error
- **AND** SHALL NOT close storage beneath the still-running task.
