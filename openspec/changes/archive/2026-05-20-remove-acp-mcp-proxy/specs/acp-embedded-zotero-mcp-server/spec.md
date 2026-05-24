## MODIFIED Requirements

### Requirement: ACP session setup SHALL inject the MCP server descriptor when available

ACP session creation and attachment SHALL pass the embedded Zotero MCP server to
the backend when the server is running. The descriptor SHALL be the direct
descriptor for the embedded Zotero MCP endpoint and SHALL NOT be wrapped through
a host MCP gateway, proxy URL, stdio shim, or equivalent forwarding layer.

#### Scenario: Descriptor injection succeeds

- **WHEN** ACP creates, loads, or resumes a session
- **AND** the embedded MCP server starts successfully
- **THEN** `mcpServers` SHALL contain an ACP MCP descriptor for the Zotero MCP endpoint
- **AND** the descriptor URL and transport fields SHALL refer to the embedded Zotero MCP server directly
- **AND** the descriptor SHALL NOT contain a `/mcp-gateway/` path or gateway observer metadata
- **AND** the adapter SHALL prefer ACP `type: "sse"` when the backend advertises SSE support
- **AND** the adapter MAY fall back to ACP `type: "http"` when SSE is unavailable and HTTP is advertised
- **AND** diagnostics SHALL include `mcp_server_injected`.

#### Scenario: MCP server is unavailable

- **WHEN** the embedded MCP server cannot start
- **THEN** ACP session setup SHALL continue without MCP servers
- **AND** diagnostics SHALL include `zotero_mcp_unavailable`.
