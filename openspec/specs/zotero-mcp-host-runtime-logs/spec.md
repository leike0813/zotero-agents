# zotero-mcp-host-runtime-logs Specification

## Purpose
TBD - created by archiving change add-zotero-mcp-host-runtime-logs. Update Purpose after archive.
## Requirements
### Requirement: MCP requests are logged host-side

The embedded Zotero MCP server SHALL record safe host-side runtime logs for MCP request lifecycle stages.

#### Scenario: Successful tool request

- **WHEN** a Zotero MCP tool call succeeds
- **THEN** runtime logs SHALL include request acceptance, tool start, tool finish, response serialization, and response write completion stages
- **AND** all entries SHALL share the same MCP request id.

#### Scenario: Tool request fails structurally

- **WHEN** a Zotero MCP tool handler or protocol dispatch fails
- **THEN** runtime logs SHALL include `tool.failed`
- **AND** the log SHALL include a safe error name and message.

#### Scenario: Response serialization fails

- **WHEN** the MCP server cannot serialize a JSON-RPC response
- **THEN** runtime logs SHALL include `response.serialize.failed`
- **AND** the server SHALL attempt a structured JSON-RPC internal error response.

#### Scenario: Response write fails

- **WHEN** writing the HTTP response to the socket fails
- **THEN** runtime logs SHALL include `response.write.failed`
- **AND** MCP health diagnostics SHALL expose the failed stage.

### Requirement: MCP status includes runtime log evidence

The MCP server SHALL expose recent safe MCP runtime log summaries in diagnostics.

#### Scenario: Agent calls status tool

- **WHEN** an agent calls `zotero.get_mcp_status`
- **THEN** the status payload SHALL include recent MCP runtime log summaries
- **AND** the summaries SHALL NOT include bearer tokens, Authorization headers, full request bodies, or full response bodies.

### Requirement: ACP MCP LED uses host health

The ACP chat MCP LED SHALL use host-derived MCP health when present.

#### Scenario: Host health is available

- **WHEN** the sidebar snapshot includes `mcpHealth`
- **THEN** the MCP LED SHALL render from `mcpHealth.severity`, `mcpHealth.summary`, and `mcpHealth.tooltip`
- **AND** SHALL NOT use raw recent request inference as the primary state model.

### Requirement: MCP transport logs expose request and response facts

The embedded Zotero MCP server SHALL record redacted transport facts needed to
diagnose backend MCP discovery failures.

#### Scenario: Tools list diagnostics include response and tool facts

- **WHEN** the server handles `tools/list`
- **THEN** runtime diagnostics SHALL include tool count, response byte metrics,
  and whether required synthesis tools are present.

#### Scenario: Streamable HTTP GET remains unsupported but visible

- **WHEN** a client sends `GET /mcp`
- **THEN** the server SHALL continue returning Method Not Allowed
- **AND** diagnostics SHALL include the unsupported stream reason and redacted
  request header facts.

