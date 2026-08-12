## MODIFIED Requirements

### Requirement: Native worker and transfer shutdown SHALL share the existing deadline

Shutdown SHALL stop HTTP and work admission, interrupt every active HTTP socket, wake queued operations, cancel active work, close the worker control pipe, terminate the child, clear transfer staging, and drain HTTP handlers within the existing 500 ms worker budget. A handler that does not drain within that bound MUST NOT keep process shutdown waiting indefinitely or permit an unsafe close of state it still owns.

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

