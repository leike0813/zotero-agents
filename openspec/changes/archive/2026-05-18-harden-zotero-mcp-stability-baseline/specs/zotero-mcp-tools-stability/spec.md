# zotero-mcp-tools-stability

## ADDED Requirements

### Requirement: JSON-RPC request identity is strict

The embedded Zotero MCP server SHALL distinguish notifications from requests by
the absence of `id`, not by a null id.

#### Scenario: Null id is rejected

- **WHEN** a client sends a JSON-RPC request with `id: null`
- **THEN** the server SHALL return a JSON-RPC invalid request or invalid params
  error
- **AND** the request SHALL NOT be treated as a notification.

#### Scenario: Missing id notification remains accepted

- **WHEN** a client sends `notifications/initialized` without an `id`
- **THEN** the server SHALL return an accepted empty HTTP response.

### Requirement: Tool input schemas are enforced

The Zotero MCP tool registry SHALL enforce declared input schemas before tool
handlers execute.

#### Scenario: Unknown or invalid arguments are rejected

- **WHEN** a client calls a tool with unknown fields, missing required fields,
  wrong types, invalid enum values, or out-of-range bounds
- **THEN** the server SHALL return a structured validation failure
- **AND** the tool handler SHALL NOT be invoked.

### Requirement: Recoverable tool errors are structured

Recoverable tool execution failures SHALL return a tool result with explicit
error metadata instead of relying on ambiguous transport failures.

#### Scenario: Business validation fails

- **WHEN** a known tool receives business-invalid input such as an invalid
  resource ref or rejected resolver
- **THEN** the MCP result SHALL set `isError=true`
- **AND** structured content SHALL include `error_code`, `retryable`,
  `retry_after_ms`, and `tool`.

### Requirement: Local HTTP transport rejects unsafe requests

The local Streamable HTTP transport SHALL reject unsafe authorization and request
shapes before invoking JSON-RPC handlers.

#### Scenario: Query token is not accepted

- **WHEN** a client authenticates with only `?token=...`
- **THEN** the server SHALL reject the request as unauthorized.

#### Scenario: Origin is not allowed

- **WHEN** a request includes an untrusted `Origin` header
- **THEN** the server SHALL reject the request
- **AND** no tool handler SHALL execute.

#### Scenario: Request body is too large

- **WHEN** a request body exceeds the configured MCP body limit
- **THEN** the server SHALL return a structured request-size failure
- **AND** diagnostics SHALL record the limit reason.
