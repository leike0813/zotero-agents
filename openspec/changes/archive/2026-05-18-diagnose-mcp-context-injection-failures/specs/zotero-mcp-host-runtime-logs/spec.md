# zotero-mcp-host-runtime-logs

## ADDED Requirements

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
