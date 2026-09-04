## ADDED Requirements

### Requirement: Unexpected post-ready loss SHALL recover once before dispatch

The production owner SHALL offer one shared recovery attempt when a client
operation discovers that an unexpectedly terminated post-ready generation has
no ready connection and the operation has not sent an RPC. Concurrent callers
SHALL share the same recovery attempt. A successful recovery SHALL allow those
callers to acquire the replacement connection and dispatch once.

#### Scenario: Ready sidecar exits before a later client call

- **WHEN** a ready sidecar terminates unexpectedly
- **AND** concurrent client operations have not sent an RPC
- **THEN** the production owner starts at most one replacement generation
- **AND** each waiting operation uses the resulting ready connection at most once

#### Scenario: Automatic recovery is not eligible

- **WHEN** production is normally stopped, disabled, incompatible, stopping, or terminal from a deterministic startup failure
- **THEN** a client operation reports the existing unavailable result
- **AND** it does not start a replacement generation automatically

#### Scenario: Automatic recovery fails

- **WHEN** the single automatic recovery attempt does not publish a ready connection
- **THEN** waiting client operations fail with a stable unavailable reason
- **AND** later automatic calls do not create a restart loop for the same failed generation
- **AND** explicit user recovery remains available

### Requirement: Dispatched operations SHALL NOT be replayed by availability recovery

Availability recovery SHALL apply only before an RPC is sent. A transport or
service failure after dispatch SHALL return to the caller without automatically
replaying the operation, regardless of whether the operation is a read or a
mutation.

#### Scenario: Connection is lost after dispatch

- **WHEN** a client operation has sent its RPC and then receives a transport or service failure
- **THEN** the operation returns that failure without automatic replay
- **AND** no duplicate mutation or external effect is created by recovery

