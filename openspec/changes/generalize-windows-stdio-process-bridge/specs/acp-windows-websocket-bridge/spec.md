# Spec Delta

## MODIFIED Requirements

### Requirement: ACP bridge SHALL authenticate local WebSocket clients

The shared stdio bridge SHALL listen only on localhost and require a random token in the WebSocket URL before accepting ACP transport traffic.

#### Scenario: Valid token connects

- **GIVEN** the plugin starts the bridge with a random token
- **WHEN** the plugin connects to `ws://127.0.0.1:<port>/v1/stdio?token=<token>`
- **THEN** the bridge SHALL accept the WebSocket handshake.

#### Scenario: Missing or wrong token is rejected

- **WHEN** a WebSocket request omits the token or supplies a different token
- **THEN** the bridge SHALL reject the request
- **AND** it SHALL NOT spawn a child process.

#### Scenario: Non-local interface is not used

- **WHEN** the plugin starts the bridge daemon
- **THEN** the bridge SHALL bind to `127.0.0.1`
- **AND** the ready file SHALL advertise only that loopback endpoint.

## ADDED Requirements

### Requirement: ACP SHALL consume the shared long-lived process contract

ACP SHALL retain its public transport and connection adapter behavior while delegating Windows child launch, byte streams, stdin EOF, wait, and termination to the platform process interface. Existing POSIX ACP process-group lifecycle behavior SHALL remain intact.

#### Scenario: ACP launches through the platform process seam

- **WHEN** ACP launches a resolved backend on Windows Zotero
- **THEN** it SHALL use the platform long-lived process interface
- **AND** its diagnostics SHALL still identify the selected transport and child lifecycle.

#### Scenario: POSIX ACP lifecycle remains validated

- **WHEN** ACP launches a backend on Linux or macOS Zotero
- **THEN** its existing validated process-group cleanup and transport diagnostics SHALL remain available.

#### Scenario: ACP closes stdin before shutdown

- **WHEN** ACP requests stdin EOF
- **THEN** it SHALL NOT close the WebSocket or report the child terminated merely because stdin closed.

#### Scenario: Bridge disconnects before exit evidence

- **WHEN** the WebSocket disconnects and no child exit has been observed
- **THEN** ACP SHALL report unknown exit outcome rather than confirmed cleanup kill.
