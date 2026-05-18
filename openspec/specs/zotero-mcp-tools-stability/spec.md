# zotero-mcp-tools-stability Specification

## Purpose
TBD - created by archiving change stabilize-zotero-mcp-tools-streamable-http. Update Purpose after archive.
## Requirements
### Requirement: Streamable HTTP-only Zotero MCP transport

The embedded Zotero MCP server SHALL support only stateless Streamable HTTP for MCP client communication.

#### Scenario: POST MCP request returns JSON-RPC response

- **WHEN** an authorized client sends a JSON-RPC request to `POST /mcp`
- **THEN** the server SHALL return `200 application/json`
- **AND** the response body SHALL contain the JSON-RPC response.

#### Scenario: MCP notification returns accepted empty response

- **WHEN** an authorized client sends a JSON-RPC notification to `POST /mcp`
- **THEN** the server SHALL return `202 Accepted`
- **AND** the response body SHALL be empty.

#### Scenario: Legacy SSE endpoints are not supported

- **WHEN** an authorized client sends `GET /mcp`
- **THEN** the server SHALL return `405 Method Not Allowed`
- **AND** diagnostics SHALL record `streamable_http_get_not_supported`.

- **WHEN** a client sends a request to `/mcp/message`
- **THEN** the server SHALL return `404 not_found`.

### Requirement: HTTP-only ACP MCP descriptor injection

ACP integration SHALL inject the embedded Zotero MCP server only as an HTTP MCP descriptor.

#### Scenario: Backend supports HTTP MCP

- **WHEN** an ACP backend advertises HTTP MCP support
- **THEN** `mcpServers` SHALL contain the Zotero descriptor with `type = "http"`.

#### Scenario: Backend supports only SSE MCP

- **WHEN** an ACP backend does not advertise HTTP MCP support
- **THEN** Zotero MCP SHALL NOT be injected
- **AND** diagnostics SHALL record `zotero_mcp_unavailable`.

### Requirement: Serialized and diagnosable tool execution

The MCP server SHALL execute Zotero `tools/call` requests serially and record safe diagnostics.

#### Scenario: Concurrent tool calls

- **WHEN** two `tools/call` requests arrive concurrently
- **THEN** both calls SHALL receive JSON-RPC responses
- **AND** diagnostics SHALL include queue wait and duration data.

#### Scenario: Tool handler failure

- **WHEN** a tool handler throws
- **THEN** the server SHALL return a JSON-RPC error or structured tool error
- **AND** the HTTP connection SHALL NOT fail without a response.

### Requirement: Agent-readable Zotero tool contracts

The Zotero MCP tool registry SHALL expose clear schemas and descriptions for supported tool arguments.

#### Scenario: Tool list documents recommended arguments

- **WHEN** an MCP client calls `tools/list`
- **THEN** each Zotero tool SHALL include an input schema with clear descriptions for refs, required fields, and write permission behavior.

#### Scenario: Invalid arguments

- **WHEN** an MCP client supplies invalid refs, empty fields, empty tags, or empty content
- **THEN** the tool SHALL return a structured parameter error
- **AND** no write SHALL occur.

### Requirement: Broker read-tool hardening

The broker-backed read tools SHALL avoid transport failure from child-level Zotero API errors.

#### Scenario: Attachment path failure

- **WHEN** an attachment path cannot be read
- **THEN** `zotero.get_item_attachments` SHALL still return available attachment DTOs
- **AND** include warnings or errors for failed child data.

#### Scenario: Note serialization failure

- **WHEN** one child note cannot be serialized
- **THEN** `zotero.get_item_notes` SHALL return remaining notes
- **AND** include warnings or errors for the failed note.

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

