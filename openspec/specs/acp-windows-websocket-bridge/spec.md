# acp-windows-websocket-bridge Specification

## Purpose

Windows ACP transport through a localhost WebSocket bridge daemon, replacing direct Mozilla Subprocess stdio on Windows while preserving existing ACP transport abstractions.

## Requirements

### Requirement: Windows ACP transport SHALL use a localhost WebSocket bridge

Windows Zotero/Mozilla runtime SHALL launch ACP backends through an independent
localhost WebSocket bridge instead of direct Mozilla Subprocess stdio. The
public ACP transport and connection adapter behavior SHALL remain unchanged for
ACP callers.

#### Scenario: Windows Zotero launches ACP through bridge

- **GIVEN** Zotero is running on Windows outside the Node test runtime
- **WHEN** an ACP backend transport is launched
- **THEN** the plugin SHALL use the WebSocket bridge transport
- **AND** it SHALL expose `transportKind = "websocket-bridge"` in lifecycle
  diagnostics
- **AND** ACP callers SHALL continue to use the existing `AcpTransport` and
  `AcpConnectionAdapter` abstractions.

#### Scenario: Non-Windows keeps existing transport

- **GIVEN** Zotero is running on Linux or macOS
- **WHEN** an ACP backend transport is launched
- **THEN** the plugin SHALL use the existing Mozilla Subprocess stdio transport
- **AND** it SHALL NOT require the Windows bridge binary.

#### Scenario: Node tests keep existing transport

- **GIVEN** the code is running in the Node test runtime
- **WHEN** an ACP backend transport is launched without bridge test overrides
- **THEN** the plugin SHALL use the Node test transport
- **AND** tests SHALL be able to inject bridge service and WebSocket overrides
  without launching the native daemon.

### Requirement: ACP bridge daemon SHALL be singleton and multiplex transports

The plugin SHALL maintain one bridge daemon per Windows plugin runtime and reuse
it across ACP transports. Each ACP transport SHALL open its own WebSocket
connection and receive its own backend child process.

#### Scenario: Multiple transports reuse one daemon

- **GIVEN** a Windows bridge daemon is already running
- **WHEN** a second ACP backend transport is launched
- **THEN** the plugin SHALL reuse the existing bridge daemon
- **AND** it SHALL open a separate WebSocket connection for that transport.

#### Scenario: Each connection owns one child process

- **GIVEN** two ACP transports are connected to the same bridge daemon
- **WHEN** each transport sends a spawn request
- **THEN** the bridge SHALL spawn one backend child per WebSocket connection
- **AND** closing one transport SHALL NOT close the other transport's child.

#### Scenario: Bridge restart after daemon exit

- **GIVEN** the cached bridge daemon has exited or its closed promise has
  settled
- **WHEN** a later ACP backend transport is launched
- **THEN** the plugin SHALL start a fresh bridge daemon
- **AND** it SHALL update the bridge snapshot with the new process facts.

### Requirement: ACP bridge wire protocol SHALL preserve ACP stdout ownership

The bridge SHALL forward bytes between WebSocket and child stdio without
interpreting ACP JSON-RPC semantics. Child stdout SHALL be returned only as
binary WebSocket frames so the plugin ACP reader remains the sole protocol
consumer.

#### Scenario: Spawn request starts child process

- **GIVEN** a WebSocket connection is accepted by the bridge
- **WHEN** the first client text frame is a valid spawn request with `type`,
  `id`, `command`, `args`, `cwd`, and `env`
- **THEN** the bridge SHALL spawn the requested child process
- **AND** it SHALL return a text control frame with `type = "spawned"`, the
  same `id`, and the child process id.

#### Scenario: Client stdin reaches child stdin

- **GIVEN** a child process has been spawned for a WebSocket connection
- **WHEN** the client sends a binary WebSocket frame
- **THEN** the bridge SHALL write those bytes to child stdin in order.

#### Scenario: Child stdout reaches plugin stdout reader

- **GIVEN** a child process writes bytes to stdout
- **WHEN** the bridge reads those bytes
- **THEN** it SHALL send those bytes as binary WebSocket frames
- **AND** it SHALL NOT wrap them in JSON control frames
- **AND** it SHALL NOT parse them as ACP messages for transport behavior.

#### Scenario: Child stderr is diagnostic control data

- **GIVEN** a child process writes bytes to stderr
- **WHEN** the bridge reads those bytes
- **THEN** it SHALL send a text control frame with `type = "stderr"` and a
  base64 payload
- **AND** stderr SHALL NOT be interleaved into ACP stdout.

#### Scenario: Child exit is reported

- **GIVEN** a child process exits
- **WHEN** the bridge observes the exit
- **THEN** it SHALL send a text control frame with `type = "exit"`, the spawn
  id, and the exit code when available.

#### Scenario: Bridge errors are explicit

- **WHEN** the bridge cannot parse the spawn request, cannot spawn the child,
  or fails to forward a stream
- **THEN** it SHALL send a text control frame with `type = "error"` and a
  diagnostic message when the WebSocket is still available.

### Requirement: ACP bridge SHALL authenticate local WebSocket clients

The bridge SHALL listen only on localhost and require a random token in the
WebSocket URL before accepting ACP transport traffic.

#### Scenario: Valid token connects

- **GIVEN** the plugin starts the bridge with a random token
- **WHEN** the plugin connects to `ws://127.0.0.1:<port>/v1/acp?token=<token>`
- **THEN** the bridge SHALL accept the WebSocket handshake.

#### Scenario: Missing or wrong token is rejected

- **WHEN** a WebSocket request omits the token or supplies a different token
- **THEN** the bridge SHALL reject the request
- **AND** it SHALL NOT spawn an ACP backend child process.

#### Scenario: Non-local interface is not used

- **WHEN** the plugin starts the bridge daemon
- **THEN** the bridge SHALL bind to `127.0.0.1`
- **AND** the ready file SHALL advertise only that loopback endpoint.

### Requirement: Windows bridge transport SHALL fail explicitly when unavailable

The Windows ACP launch path SHALL report bridge startup and connection failures
as bridge transport errors. It SHALL NOT silently fall back to direct Mozilla
Subprocess stdio on Windows.

#### Scenario: Bridge binary is missing

- **GIVEN** the packaged ACP bridge binary cannot be read or copied to the
  runtime directory
- **WHEN** a Windows ACP transport is launched
- **THEN** launch SHALL fail with an explicit bridge binary diagnostic
- **AND** it SHALL NOT start the backend through direct stdio as a fallback.

#### Scenario: Ready file is not written

- **GIVEN** the bridge process starts but does not write a valid ready file
- **WHEN** the ready timeout expires
- **THEN** launch SHALL fail with the ready-file diagnostic
- **AND** it SHALL include the bridge log path when available.

#### Scenario: WebSocket connection fails

- **GIVEN** the bridge daemon is started
- **WHEN** the plugin cannot open the WebSocket connection
- **THEN** launch SHALL fail with a WebSocket bridge diagnostic
- **AND** the error SHALL include bridge lifecycle facts available to the
  plugin.
