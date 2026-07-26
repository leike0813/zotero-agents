## ADDED Requirements

### Requirement: Mozilla subprocess transports SHALL drain pipes from process creation

The Mozilla ACP subprocess transport SHALL start stdout and stderr consumers immediately after subprocess creation and before asynchronous process identity discovery.

#### Scenario: Process exits during identity discovery
- **WHEN** a newly created Mozilla subprocess writes stderr and exits before process identity discovery completes
- **THEN** the stderr consumer SHALL already be active
- **AND** the exit diagnostic SHALL be retained in the final transport snapshot

### Requirement: ACP transport close snapshots SHALL finalize after bounded pipe drain

The transport `closed` completion SHALL wait for process settlement and a bounded completion of stdout and stderr consumers before exposing its final immutable snapshot.

#### Scenario: Buffered stderr arrives after process exit
- **WHEN** the subprocess settles while buffered stderr remains readable
- **THEN** `closed` SHALL wait within the pipe-drain bound
- **AND** its final snapshot SHALL include the captured stderr tail

#### Scenario: Pipe does not complete
- **WHEN** a pipe consumer does not settle within the configured bound
- **THEN** transport close SHALL complete without an unbounded wait
- **AND** the snapshot SHALL retain the available output and pipe-drain status

### Requirement: ACP client close completion SHALL preserve origin and reason

`AcpClientConnection.closed` SHALL remain an awaitable property and SHALL resolve with a structured close result distinguishing local close, remote EOF, and receive-loop error. Receive-loop failures SHALL retain their original reason or error metadata.

#### Scenario: User closes connection
- **WHEN** the caller actively closes the ACP client connection
- **THEN** `closed` SHALL resolve with local close origin

#### Scenario: Remote stream reaches EOF
- **WHEN** the ACP receive stream ends without a receive-loop exception
- **THEN** `closed` SHALL resolve with remote EOF origin

#### Scenario: Receive loop rejects
- **WHEN** the ACP receive loop throws while reading or parsing a message
- **THEN** `closed` SHALL resolve with receive-error origin
- **AND** the structured result SHALL retain the receive failure reason

