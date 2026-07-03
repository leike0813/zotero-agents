## MODIFIED Requirements

### Requirement: ACP bridge daemon SHALL be singleton and multiplex transports

The plugin SHALL maintain one bridge daemon per Windows plugin runtime and reuse
it across ACP transports. Each ACP transport SHALL open its own WebSocket
connection and receive its own backend child process. The singleton daemon SHALL
be explicitly terminated during plugin shutdown and test reset.

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

#### Scenario: Plugin shutdown terminates bridge daemon

- **GIVEN** the ACP WebSocket bridge daemon is running
- **WHEN** plugin shutdown cleanup runs
- **THEN** the plugin SHALL clear the cached bridge singleton
- **AND** it SHALL request bridge process termination
- **AND** shutdown SHALL NOT wait more than the configured bounded timeout for
  the bridge process wait promise to settle.

#### Scenario: Test reset terminates bridge daemon

- **GIVEN** tests have seeded or started an ACP WebSocket bridge daemon
- **WHEN** ACP bridge test reset runs
- **THEN** it SHALL use the same bounded shutdown behavior as plugin shutdown.
