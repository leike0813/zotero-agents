# zotero-mcp-concurrency-queue-policy Specification

## Purpose
TBD - created by archiving change define-zotero-mcp-concurrency-queue-policy. Update Purpose after archive.
## Requirements
### Requirement: Streamable HTTP tool calls are serialized

The embedded Zotero MCP server SHALL accept concurrent Streamable HTTP
`tools/call` requests while executing Zotero host API calls through a single FIFO
worker.

#### Scenario: Concurrent tools/call requests are queued

- **WHEN** multiple `tools/call` requests arrive concurrently
- **THEN** the server SHALL accept up to one running request and eight pending
  requests
- **AND** execution SHALL enter Zotero host APIs in FIFO order
- **AND** each accepted request SHALL receive an HTTP response with a JSON-RPC
  response body.

#### Scenario: Non-tool requests bypass the queue

- **WHEN** `initialize`, `tools/list`, or `notifications/initialized` arrives
  while tool calls are queued
- **THEN** the server SHALL handle the request without waiting for the tool-call
  queue.

### Requirement: Queue capacity failures are structured

The embedded Zotero MCP server SHALL return structured JSON-RPC capacity errors
instead of transport failures when the tool queue cannot admit or start a
request.

#### Scenario: Queue is full

- **WHEN** the queue already has one running request and eight pending requests
- **AND** another `tools/call` request arrives
- **THEN** the response SHALL be a JSON-RPC error with code `-32001`
- **AND** `error.data.code` SHALL equal `zotero_mcp_queue_full`
- **AND** the tool handler SHALL NOT be invoked.

#### Scenario: Queue wait times out

- **WHEN** an accepted `tools/call` waits longer than the configured queue wait
  timeout
- **THEN** the response SHALL be a JSON-RPC error with code `-32002`
- **AND** `error.data.code` SHALL equal `zotero_mcp_queue_timeout`
- **AND** the tool handler SHALL NOT be invoked for that request.

### Requirement: Queue diagnostics are exported

The embedded Zotero MCP server SHALL expose safe queue diagnostics.

#### Scenario: Request log includes queue metrics

- **WHEN** a `tools/call` request completes or fails due to queue capacity
- **THEN** the recent request log SHALL include queue policy, queue depth at
  accept, queue position, queue wait milliseconds, execution duration,
  `toolOutcome`, and limit reason.

#### Scenario: Server status includes queue snapshot

- **WHEN** diagnostics are exported
- **THEN** MCP server status SHALL include current queue policy and queue state
  without exposing bearer tokens.

### Requirement: Running timeout preserves host-call serialization

The MCP tool-call queue SHALL NOT start another queued Zotero host API call
while a timed-out tool handler is still running.

#### Scenario: Running tool times out but continues internally

- **WHEN** a running `tools/call` exceeds the configured running timeout
- **THEN** the caller SHALL receive a structured timeout response
- **AND** the queue SHALL keep the running slot occupied until the underlying
  handler settles
- **AND** the next queued tool SHALL NOT enter the host API before that settle
  event.

#### Scenario: Queue status reports retained timeout

- **WHEN** a timed-out handler is still occupying the running slot
- **THEN** MCP status SHALL report one running call and the active tool name.

