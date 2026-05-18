# zotero-mcp-guard-watchdog Specification

## Purpose
TBD - created by archiving change harden-zotero-mcp-watchdog-circuit-breakers. Update Purpose after archive.
## Requirements
### Requirement: Running tool calls are bounded

The embedded Zotero MCP server SHALL bound accepted `tools/call` execution time independently from pending queue wait time.

#### Scenario: Running tool call times out

- **WHEN** a running Zotero tool exceeds the configured running timeout
- **THEN** the server SHALL return JSON-RPC error code `-32003`
- **AND** `error.data.code` SHALL equal `zotero_mcp_tool_timeout`
- **AND** diagnostics SHALL record `toolOutcome=error` and `toolErrorName=ZoteroMcpToolTimeoutError`.

### Requirement: Tool failures are circuit-breakable

The embedded Zotero MCP server SHALL temporarily reject repeatedly failing tools.

#### Scenario: Tool circuit opens

- **WHEN** the same tool has three qualifying runtime failures within five minutes
- **THEN** subsequent calls to that tool SHALL return JSON-RPC error code `-32010`
- **AND** `error.data.code` SHALL equal `zotero_mcp_tool_circuit_open`
- **AND** the tool handler SHALL NOT be invoked until cooldown expires.

### Requirement: Request listener failures produce fallback responses

The embedded Zotero MCP server SHALL try to respond to request-level failures instead of silently terminating the HTTP transport.

#### Scenario: Listener catches fatal request failure

- **WHEN** a fatal request handler error occurs after receiving request data
- **THEN** the server SHALL attempt to return a JSON-RPC internal error using the request id when available
- **AND** diagnostics SHALL record `zotero_mcp_error`.

### Requirement: Watchdog restart is diagnosable

The embedded Zotero MCP server SHALL expose watchdog restart state.

#### Scenario: Server restarts after socket stop or fatal request error

- **WHEN** the server socket stops unexpectedly or request handling records a fatal error
- **THEN** the watchdog SHALL attempt to restart the embedded server
- **AND** status SHALL expose restart count, last restart time, last fatal error, and whether the descriptor endpoint is stale.

### Requirement: MCP status tool is available

The embedded Zotero MCP server SHALL expose a non-queued diagnostic tool named `zotero.get_mcp_status`.

#### Scenario: Agent queries MCP status

- **WHEN** an MCP client calls `zotero.get_mcp_status`
- **THEN** the tool SHALL return server status, queue state, guard state, circuit breaker state, and recent request summaries
- **AND** the result SHALL NOT expose bearer tokens.

### Requirement: Read tool failures are structured

Broker-backed Zotero read tools SHALL avoid raw transport failures for common item, note, and attachment failures.

#### Scenario: Item reference not found

- **WHEN** a read tool receives a missing item reference
- **THEN** the response SHALL be a structured JSON-RPC error
- **AND** `error.data.code` SHALL equal `zotero_item_not_found`.

#### Scenario: Child note or attachment fails

- **WHEN** one child note or attachment cannot be serialized
- **THEN** the tool SHALL return available child DTOs
- **AND** include warnings or errors for the failed child.

### Requirement: Timed-out active tools are diagnosable

The MCP status tool SHALL expose enough state for agents and the UI to
distinguish a completed timeout from a timed-out handler that is still running.

#### Scenario: Active timed-out tool remains running

- **WHEN** a tool has returned a timeout response but the underlying handler has
  not settled
- **THEN** `get_mcp_status` SHALL include `timedOutButStillRunning=true`
- **AND** it SHALL include active tool, running start time, timeout threshold,
  and retry guidance.

### Requirement: Weak token generation is not allowed

The embedded MCP server SHALL require a secure random source for bearer token
generation.

#### Scenario: Secure random source is unavailable

- **WHEN** no crypto-grade random source is available
- **THEN** MCP startup SHALL fail closed
- **AND** diagnostics SHALL record a safe startup failure.

