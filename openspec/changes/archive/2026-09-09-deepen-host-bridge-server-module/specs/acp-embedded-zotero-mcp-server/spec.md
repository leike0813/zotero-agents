## MODIFIED Requirements

### Requirement: Embedded MCP server SHALL expose a localhost HTTP endpoint


The plugin SHALL provide embedded MCP over the unified Host Access HTTP listener
when the MCP server preference is enabled.

#### Scenario: MCP JSON-RPC endpoint shares Host Access listener

- **WHEN** the embedded MCP route is enabled
- **THEN** `POST /mcp` SHALL be served by the same listener and port as
  `/bridge/v2/*`
- **AND** JSON-RPC behavior SHALL remain unchanged.

#### Scenario: Preference-disabled route

- **GIVEN** `mcpServer.enabled` is false
- **WHEN** plugin startup or ACP compatibility asks for MCP
- **THEN** the MCP descriptor SHALL be unavailable
- **AND** the unified Host Access listener MAY continue serving `/bridge/v2/*`.

#### Scenario: Preference-enabled startup

- **GIVEN** `mcpServer.enabled` is true or unset
- **WHEN** the plugin starts
- **THEN** the embedded MCP server SHALL start on a localhost HTTP endpoint

#### Scenario: Preference-disabled startup

- **GIVEN** `mcpServer.enabled` is false
- **WHEN** the plugin starts or an ACP compatibility path asks for MCP
- **THEN** the embedded MCP server SHALL remain stopped

