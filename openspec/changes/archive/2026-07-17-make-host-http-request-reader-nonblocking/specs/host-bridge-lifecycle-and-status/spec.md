## MODIFIED Requirements

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

