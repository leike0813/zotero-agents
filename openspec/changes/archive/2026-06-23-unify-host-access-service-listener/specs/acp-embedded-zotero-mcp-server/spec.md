## MODIFIED Requirements

### Requirement: Embedded MCP server SHALL expose a localhost HTTP endpoint

The plugin SHALL provide embedded MCP over the unified Host Access HTTP listener
when the MCP server preference is enabled.

#### Scenario: MCP JSON-RPC endpoint shares Host Access listener

- **WHEN** the embedded MCP route is enabled
- **THEN** `POST /mcp` SHALL be served by the same listener and port as
  `/bridge/v1/*`
- **AND** JSON-RPC behavior SHALL remain unchanged.

#### Scenario: Preference-disabled route

- **GIVEN** `mcpServer.enabled` is false
- **WHEN** plugin startup or ACP compatibility asks for MCP
- **THEN** the MCP descriptor SHALL be unavailable
- **AND** the unified Host Access listener MAY continue serving `/bridge/v1/*`.

### Requirement: ACP session setup SHALL inject the MCP server descriptor when available

ACP session creation and attachment SHALL pass the embedded Zotero MCP descriptor
when the unified Host Access listener is running and MCP is enabled.

#### Scenario: Descriptor uses unified Host Access port

- **WHEN** ACP creates, loads, or resumes a session with MCP enabled
- **THEN** the MCP descriptor URL SHALL use the unified Host Access listener port
  with path `/mcp`
- **AND** in LAN mode the descriptor SHALL use the same advertised host as the
  Host Bridge remote endpoint.

### Requirement: Embedded MCP server SHALL use Host Bridge authentication

The embedded MCP route SHALL accept the same bearer token authentication as the
Host Bridge CLI and SHALL NOT mint a separate MCP-only token.

#### Scenario: Token rotation affects MCP route

- **WHEN** the Host Bridge token is rotated
- **THEN** subsequent MCP requests SHALL require the new Host Bridge token.
