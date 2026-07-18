## ADDED Requirements

### Requirement: Every sidecar stop path SHALL terminate compute descendants

The service and supervisor SHALL ensure that authenticated shutdown, host-lease
expiry, stdin EOF, supervisor stop, and direct Node-process termination stop
compute admission and leave no worker thread or descendant process alive.

#### Scenario: Host liveness ends during active compute

- **WHEN** lease expiry or stdin EOF begins service shutdown
- **THEN** the service SHALL invoke bounded pool shutdown before completion
- **AND** the Node process SHALL exit without a surviving worker.

#### Scenario: Supervisor force-terminates Node

- **WHEN** graceful shutdown exceeds the supervisor budget
- **THEN** terminating the service process SHALL terminate its worker threads as
  part of the same process boundary.

### Requirement: Compute saturation SHALL not block lifecycle control

Health, handshake, and authenticated shutdown SHALL remain responsive while the
worker is active, hung, or its queue is full.

#### Scenario: Shutdown is called with a hung worker

- **WHEN** authenticated shutdown arrives while compute is hung
- **THEN** shutdown acceptance SHALL be returned promptly
- **AND** service termination SHALL remain bounded.
