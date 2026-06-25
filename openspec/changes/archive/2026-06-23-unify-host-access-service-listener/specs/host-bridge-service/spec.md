## MODIFIED Requirements

### Requirement: Host Bridge service exposes HTTP JSON v1

The system SHALL expose a plugin-owned Host Access HTTP listener for local and
explicitly enabled LAN clients. The Host Bridge REST API SHALL remain available
under `/bridge/v1`.

#### Scenario: Unified listener serves Host Bridge and MCP routes

- **WHEN** the Host Access listener is running
- **THEN** `GET /bridge/v1/health` SHALL return Host Bridge health metadata
- **AND** `POST /mcp` SHALL be routable by the same listener when MCP is enabled
- **AND** both routes SHALL use the same bound port.

#### Scenario: LAN binding exposes the unified listener

- **GIVEN** Host Bridge LAN binding is enabled
- **WHEN** Host Access starts
- **THEN** the listener SHALL bind according to the Host Bridge LAN setting
- **AND** both `/bridge/v1/*` and `/mcp` SHALL be available on that listener
- **AND** LAN mode SHALL require the configured fixed Host Bridge port.

### Requirement: Host Bridge service requires bearer authentication

The system SHALL require bearer-token authentication for all Host Bridge
requests except `GET /bridge/v1/health`, and SHALL share that bearer token with
the MCP route.

#### Scenario: Shared token authorizes both protocol routes

- **GIVEN** a client has the current Host Bridge bearer token
- **WHEN** it calls authenticated `/bridge/v1/*` routes or `/mcp`
- **THEN** the same token SHALL authorize both protocol surfaces.

### Requirement: Host Bridge settings expose the minimal user controls

The plugin SHALL expose Host Access controls for LAN binding, fixed port, token
rotation, endpoint display, CLI installation, and MCP enablement without adding
a separate MCP port or LAN control.

#### Scenario: Unified settings control both protocols

- **WHEN** the user changes LAN binding or fixed-port settings
- **THEN** the Host Access listener SHALL restart using those settings
- **AND** Host Bridge and MCP endpoint metadata SHALL report the same port.
