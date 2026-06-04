## MODIFIED Requirements

### Requirement: Embedded MCP server SHALL expose a localhost HTTP endpoint

The plugin SHALL provide an embedded MCP server bound to localhost when the MCP
server preference is enabled.

#### Scenario: Preference-enabled startup

- **GIVEN** `mcpServer.enabled` is true or unset
- **WHEN** the plugin starts
- **THEN** the embedded MCP server SHALL start on a localhost HTTP endpoint

#### Scenario: Preference-disabled startup

- **GIVEN** `mcpServer.enabled` is false
- **WHEN** the plugin starts or an ACP compatibility path asks for MCP
- **THEN** the embedded MCP server SHALL remain stopped

### Requirement: Embedded MCP server SHALL use Host Bridge authentication

The embedded MCP server SHALL accept the same bearer token authentication as the
Host Bridge CLI and SHALL NOT mint a separate MCP-only token.

#### Scenario: Host Bridge token authorizes MCP

- **GIVEN** a client has the current Host Bridge bearer token
- **WHEN** it calls the MCP endpoint with `Authorization: Bearer <token>`
- **THEN** the request SHALL be authorized

### Requirement: MCP tools SHALL mirror Host Bridge capabilities

The embedded MCP server SHALL expose Host Bridge capability names as MCP tool
names and SHALL dispatch calls through the Host Bridge capability registry.

#### Scenario: Tool list uses capability names

- **WHEN** a client calls `tools/list`
- **THEN** the returned tools SHALL include capability names such as
  `context.get_current_view`, `library.get_item_detail`, and
  `diagnostic.get_status`
- **AND** the returned tools SHALL NOT require legacy MCP-specific names

