## MODIFIED Requirements

### Requirement: Supervised Host Bridge Lifecycle

The plugin SHALL treat Host Bridge supervision as the single Host Access socket
lifecycle.

#### Scenario: Plugin startup starts unified supervision

- **WHEN** plugin startup reaches normal runtime initialization
- **THEN** Host Bridge supervision SHALL start the unified Host Access listener
- **AND** MCP SHALL NOT create a separate server socket.

#### Scenario: Unexpected socket stop recovers both routes

- **WHEN** the unified Host Access socket stops while supervision is enabled
- **THEN** the service SHALL schedule Host Bridge recovery
- **AND** Host Bridge and MCP route status SHALL reflect the same listener
  availability.

### Requirement: Host Bridge Status Snapshot

The Host Bridge status snapshot SHALL include lifecycle and port diagnostics for
the unified Host Access listener.

#### Scenario: MCP status is derived from Host Access listener

- **WHEN** MCP status is requested
- **THEN** it SHALL report route enablement, endpoint, port, and diagnostics
  derived from the unified Host Access listener
- **AND** it SHALL NOT report an independent socket port.
