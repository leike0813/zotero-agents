## MODIFIED Requirements

### Requirement: ACP session setup SHALL inject the MCP server descriptor when available

ACP session creation and attachment SHALL pass the embedded Zotero MCP server to
the backend when the server is running. When an ACP MCP smoke gateway is active
for the adapter, session setup SHALL pass the gateway-wrapped descriptor to the
backend while preserving the original embedded Zotero MCP descriptor as redacted
forwarding metadata.

#### Scenario: Descriptor injection succeeds

- **WHEN** ACP creates, loads, or resumes a session
- **AND** the embedded MCP server starts successfully
- **THEN** `mcpServers` SHALL contain an ACP MCP descriptor for the Zotero MCP
  endpoint or its gateway-wrapped equivalent
- **AND** the adapter SHALL prefer ACP `type: "sse"` when the backend advertises
  SSE support
- **AND** the adapter MAY fall back to ACP `type: "http"` when SSE is unavailable
  and HTTP is advertised
- **AND** diagnostics SHALL include `mcp_server_injected`
- **AND** gateway diagnostics SHALL NOT expose bearer tokens or authorization
  header values.

#### Scenario: MCP server is unavailable

- **WHEN** the embedded MCP server cannot start
- **THEN** ACP session setup SHALL continue without MCP servers
- **AND** diagnostics SHALL include `zotero_mcp_unavailable`.
