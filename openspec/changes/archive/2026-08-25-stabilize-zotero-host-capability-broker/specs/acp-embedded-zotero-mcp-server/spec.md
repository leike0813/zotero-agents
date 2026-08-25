## MODIFIED Requirements

### Requirement: MCP tools SHALL mirror Host Bridge capabilities

The embedded MCP server SHALL expose Host Bridge capability names as MCP tool names and SHALL dispatch every tool call through the Host Bridge capability registry. It SHALL NOT maintain a second direct tool registry, reconstruct broker capabilities from `WorkflowHostApi`, or expose a fallback execution path with different DTO, permission, error, or locality behavior.

#### Scenario: Tool list uses capability names

- **WHEN** a client calls `tools/list`
- **THEN** the returned tools SHALL be derived from the Host Bridge capability contract
- **AND** the returned tools SHALL include capability names such as `context.get_current_view`, `library.get_item_detail`, and `diagnostic.get_status`
- **AND** legacy MCP-specific aliases SHALL NOT be listed.

#### Scenario: Tool call executes

- **WHEN** a client calls a listed MCP tool
- **THEN** validation, permission, broker invocation, error mapping, and remote output projection SHALL follow the same Host Bridge capability path used by `/bridge/v2/call`.

