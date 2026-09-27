## MODIFIED Requirements

### Requirement: Running tool calls are bounded

The embedded Zotero MCP server SHALL bound accepted `tools/call` execution time with a 45-second watchdog independently from Broker native-slice admission. Timeout SHALL signal trusted logical cancellation; the inflight admission remains occupied until the underlying handler settles.

#### Scenario: Running tool call times out

- **WHEN** a running Zotero tool exceeds the configured running timeout
- **THEN** the server SHALL return JSON-RPC error code `-32003`
- **AND** `error.data.code` SHALL equal `zotero_mcp_tool_timeout`
- **AND** diagnostics SHALL record `toolOutcome=error` and `toolErrorName=ZoteroMcpToolTimeoutError`.

### Requirement: MCP status tool is available

The embedded Zotero MCP server SHALL expose an admission-bypassing diagnostic tool named `zotero.get_mcp_status`.

#### Scenario: Agent queries MCP status

- **WHEN** an MCP client calls `zotero.get_mcp_status`
- **THEN** the tool SHALL return server status, inflight admission state, guard state, circuit breaker state, and recent request summaries
- **AND** the result SHALL NOT expose bearer tokens.

### Requirement: Read tool failures are structured
Broker-backed Zotero read tools SHALL preserve stable Broker error semantics. Failure to hydrate or read any target in a page SHALL fail the whole page; no available-children success or warning substitute SHALL mask the missing target.

#### Scenario: Item reference not found
- **WHEN** a read tool receives a missing item reference
- **THEN** the response is structured and preserves the Broker not-found semantics.

#### Scenario: Child note or attachment fails
- **WHEN** one target note, attachment or annotation cannot be read
- **THEN** the page fails with a structured error and exposes no partial successful page.
