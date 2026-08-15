## ADDED Requirements

### Requirement: Native process modes SHALL sit behind a narrow library interface
The sidecar library SHALL privately own the native runtime module graph and SHALL expose only the production serve entry, worker-mode entry, and serve terminal outcome needed by the executable adapter.

#### Scenario: Executable ownership is inspected
- **WHEN** the native executable target is reviewed
- **THEN** it SHALL own argument routing and terminal rendering only
- **AND** SHALL NOT declare or compose the production runtime module graph

#### Scenario: Worker mode is selected
- **WHEN** the executable receives the existing `worker` command
- **THEN** it SHALL enter the independent worker framing module
- **AND** production serve lifecycle ownership SHALL NOT extend into worker mode

#### Scenario: Production serve mode is selected
- **WHEN** the executable receives the existing `serve --config CONFIG` command
- **THEN** it SHALL call the blocking library-owned serve lifecycle
- **AND** the library SHALL keep worker scheduling, transfer staging, capability dispatch, and loopback transport as private authorities

### Requirement: Loopback transport SHALL NOT own production resources
The loopback transport authority SHALL own listener binding, connection admission, socket interruption, and handler draining without receiving storage, application, worker, transfer, or background-task ownership.

#### Scenario: A connection is dispatched
- **WHEN** the listener admits an HTTP connection
- **THEN** the transport authority SHALL invoke the configured request dispatcher through its internal interface
- **AND** lifecycle cleanup ordering SHALL remain outside transport dispatch

