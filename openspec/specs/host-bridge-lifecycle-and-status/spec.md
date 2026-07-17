# host-bridge-lifecycle-and-status Specification

## Purpose
TBD - created by archiving change harden-host-bridge-lifecycle-and-status. Update Purpose after archive.
## Requirements
### Requirement: Supervised Host Bridge Lifecycle

The plugin SHALL treat Host Bridge supervision as the single Host Access listener and accepted-connection lifecycle. Each accepted connection SHALL belong to the listener generation that accepted it.

#### Scenario: Plugin startup starts unified supervision

- **WHEN** plugin startup reaches normal runtime initialization
- **THEN** Host Bridge supervision SHALL start the unified Host Access listener
- **AND** MCP SHALL NOT create a separate server socket.

#### Scenario: Unexpected socket stop recovers both routes

- **WHEN** the unified Host Access socket stops while supervision is enabled
- **THEN** the service SHALL schedule Host Bridge recovery
- **AND** Host Bridge and MCP route status SHALL reflect the same listener availability.

#### Scenario: Plugin startup starts supervision

- **WHEN** plugin startup reaches normal runtime initialization
- **THEN** Host Bridge supervision SHALL be enabled
- **AND** Host Bridge startup SHALL run in the background without blocking plugin initialization.

#### Scenario: Plugin shutdown stops supervision

- **WHEN** the plugin shuts down
- **THEN** Host Bridge supervision SHALL be disabled
- **AND** the Host Bridge listener and all accepted connections SHALL be aborted and closed without scheduling recovery
- **AND** shutdown SHALL NOT wait for an already-running business handler.

#### Scenario: Unexpected socket stop recovers

- **WHEN** the Host Bridge socket stops while supervision is enabled
- **THEN** the service status SHALL record a recovery reason
- **AND** the service SHALL schedule a delayed restart.

#### Scenario: Stale listener callback arrives after restart

- **WHEN** a stop or request callback from an older listener generation arrives after a new listener is running
- **THEN** the callback SHALL NOT modify the new listener state or close a new-generation connection.

### Requirement: Configurable Pinned Port

The plugin SHALL allow users to pin Host Bridge to a fixed local port.

#### Scenario: Pinned port is used

- **GIVEN** `hostBridgePinPortEnabled` is true
- **AND** `hostBridgePinnedPort` is a valid available port
- **WHEN** Host Bridge starts
- **THEN** it SHALL bind the configured port
- **AND** the status snapshot SHALL report `portMode = "pinned"`.

#### Scenario: Pinned port conflict falls back

- **GIVEN** `hostBridgePinPortEnabled` is true
- **AND** the configured port cannot be bound
- **WHEN** Host Bridge starts
- **THEN** the plugin SHALL set `hostBridgePinPortEnabled` to false
- **AND** Host Bridge SHALL fall back to the random port range
- **AND** the status snapshot SHALL report fallback diagnostics.

### Requirement: Host Bridge Status Snapshot

The Host Bridge status snapshot SHALL include lifecycle and port diagnostics for
the unified Host Access listener.

#### Scenario: MCP status is derived from Host Access listener

- **WHEN** MCP status is requested
- **THEN** it SHALL report route enablement, endpoint, port, and diagnostics
  derived from the unified Host Access listener
- **AND** it SHALL NOT report an independent socket port.

#### Scenario: Snapshot exposes non-secret diagnostics

- **WHEN** Host Bridge status is requested
- **THEN** the snapshot SHALL include `portMode`, `pinPortEnabled`,
  `pinnedPort`, `supervised`, `restartCount`, and `lastRecoveryReason`
- **AND** the snapshot SHALL NOT expose bearer tokens or unrelated local paths.

### Requirement: Accepted connection initialization is exception safe
The unified Host Access listener SHALL own every resource opened for an accepted transport from the start of initialization. Any synchronous initialization failure SHALL close all resources already acquired, SHALL NOT escape the listener callback, and SHALL NOT poison the listener.

#### Scenario: Initialization fails after one stream opens
- **WHEN** accepted-connection initialization fails after an input or output stream has opened
- **THEN** the opened stream and transport SHALL be released exactly once
- **AND** a later connection on the same listener SHALL still be served.

### Requirement: Successful response completion is distinct from abort cleanup
After a complete response has been handed to the output stream and that stream closes successfully, the listener SHALL release its connection registry ownership without immediately abort-closing the transport. Shutdown, stale generation, initialization failure, and response-write failure SHALL instead cancel and close the accepted connection exactly once.

#### Scenario: Response is written successfully
- **WHEN** a handler produces a complete response and output close succeeds
- **THEN** the client SHALL be able to receive the complete response
- **AND** the connection SHALL no longer remain in the accepted-connection registry.

#### Scenario: Shutdown interrupts a pending request
- **WHEN** listener shutdown occurs before response completion
- **THEN** the reader, output stream, and transport SHALL be canceled or closed exactly once
- **AND** no response SHALL be written after shutdown.

