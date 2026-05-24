# acp-embedded-zotero-mcp-server Specification

## Purpose
TBD - created by archiving change spike-acp-embedded-zotero-mcp-server. Update Purpose after archive.
## Requirements
### Requirement: Embedded MCP server SHALL expose a minimal localhost HTTP endpoint

The plugin SHALL provide a spike-only MCP server bound to localhost.

#### Scenario: Health endpoint

- **WHEN** the embedded MCP server is running
- **THEN** `GET /health` SHALL return server status and endpoint metadata
- **AND** it SHALL NOT expose the bearer token.

#### Scenario: MCP JSON-RPC endpoint

- **WHEN** a client sends `POST /mcp` with a valid bearer token
- **THEN** the server SHALL handle `initialize`, `notifications/initialized`, `tools/list`, and `tools/call`
- **AND** JSON-RPC requests SHALL return one `application/json` JSON-RPC response
- **AND** JSON-RPC notifications SHALL return `202 Accepted` with no body
- **AND** unsupported methods SHALL return a JSON-RPC method-not-found error.

#### Scenario: Optional GET stream is available as a compatibility shim

- **WHEN** a client opens `GET /mcp` with a valid bearer token
- **THEN** the server SHALL return `200 OK` with `Content-Type: text/event-stream`
- **AND** it SHALL keep the stream open until the client or runtime closes it
- **AND** the server SHALL advertise `/mcp/message` only when the active descriptor is ACP `type: "sse"`.

#### Scenario: Official MCP SDK compatibility

- **WHEN** an official MCP SDK client connects with `StreamableHTTPClientTransport`
- **THEN** the client SHALL complete initialization
- **AND** the client SHALL be able to list and call `zotero.get_current_view`.

### Requirement: Zotero current view tool SHALL be available

The embedded MCP server SHALL expose a read-only `zotero.get_current_view` tool.

#### Scenario: Tool call

- **WHEN** the client calls `zotero.get_current_view`
- **THEN** the response SHALL include current ACP host context fields
- **AND** the response SHALL include a compact text summary.

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

### Requirement: MCP diagnostics SHALL be observable and safe

The system SHALL expose embedded MCP status in diagnostics without leaking secrets.

#### Scenario: Diagnostics copied

- **WHEN** the ACP diagnostics bundle is copied
- **THEN** it SHALL include embedded MCP status and endpoint metadata
- **AND** it SHALL mask bearer tokens and authorization headers.
- **AND** it SHALL include a bounded recent request log with JSON-RPC method names and HTTP response status.
- **AND** it SHALL include the current SSE client count.

### Requirement: Embedded MCP server SHALL be stopped during cleanup

The embedded MCP server SHALL release its listening port during ACP/plugin cleanup.

#### Scenario: Runtime cleanup

- **WHEN** ACP runtime test reset or plugin shutdown cleanup runs
- **THEN** the embedded MCP server SHALL stop and release its port.

