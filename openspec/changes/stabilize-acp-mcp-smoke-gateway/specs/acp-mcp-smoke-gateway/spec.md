## ADDED Requirements

### Requirement: ACP MCP smoke gateway SHALL wrap host-injected descriptors

The host SHALL wrap MCP descriptors that it injects into ACP sessions with a
gateway descriptor before handing them to the ACP agent.

#### Scenario: HTTP or SSE descriptor is wrapped

- **GIVEN** the host injects an HTTP or SSE MCP descriptor into an ACP session
- **WHEN** the adapter prepares the session MCP server list
- **THEN** it SHALL replace the descriptor endpoint with a local gateway endpoint
- **AND** it SHALL retain enough redacted metadata to forward to the original
  endpoint.

#### Scenario: Stdio descriptor is wrapped

- **GIVEN** the host injects a stdio MCP descriptor into an ACP session
- **WHEN** the adapter prepares the session MCP server list
- **THEN** it SHALL replace the descriptor command with the host stdio shim
- **AND** it SHALL write a per-connection shim config containing the original
  command, args, env, cwd, observer endpoint, token, and `connectionId`.

#### Scenario: Agent-private MCP configuration is outside scope

- **GIVEN** an ACP agent has MCP configuration that was not injected by the host
- **WHEN** required-MCP smoke runs
- **THEN** the gateway SHALL NOT treat that private configuration as decision
  evidence for the host-injected smoke contract.

### Requirement: ACP MCP smoke gateway SHALL isolate observations by span

The gateway SHALL count smoke observations only for the current active
`connectionId` and `smokeAttemptId`.

#### Scenario: Current span observes a required tool

- **GIVEN** a smoke span is active for a connection
- **AND** the span requires a tool named `tool.alpha`
- **WHEN** the gateway observes a `tools/call` request for `tool.alpha` on that
  connection and smoke attempt
- **THEN** the span SHALL mark `tool.alpha` as reached.

#### Scenario: Old connection event is ignored

- **GIVEN** a smoke span is active for connection `B`
- **WHEN** the gateway observes a `tools/call` event from connection `A`
- **THEN** the event SHALL NOT change connection `B`'s reached tools.

#### Scenario: Old smoke attempt event is ignored

- **GIVEN** smoke attempt `new` is active for a connection
- **WHEN** the gateway observes a `tools/call` event associated with smoke
  attempt `old`
- **THEN** the event SHALL NOT change attempt `new`'s reached tools.

### Requirement: Active smoke SHALL short-circuit tool calls

During an active smoke span, the gateway SHALL return synthetic successful MCP
tool results for observed `tools/call` probes instead of forwarding those calls
to the underlying MCP server.

#### Scenario: Required smoke call is not forwarded

- **GIVEN** a smoke span is active and requires `tool.alpha`
- **WHEN** the ACP agent calls `tools/call` for `tool.alpha`
- **THEN** the gateway SHALL record the observation
- **AND** it SHALL return a successful MCP tool result with the original
  JSON-RPC response id
- **AND** it SHALL NOT forward that `tools/call` to the underlying MCP server.

#### Scenario: Batch smoke calls preserve response identity

- **GIVEN** a smoke span is active
- **WHEN** the ACP agent sends a JSON-RPC batch containing multiple
  `tools/call` requests
- **THEN** the gateway SHALL observe each required tool call independently
- **AND** it SHALL return one response per request id that it short-circuits.

#### Scenario: Non-tool smoke traffic is forwarded

- **GIVEN** a smoke span is active
- **WHEN** the ACP agent sends `initialize`, `tools/list`, notifications, or
  another non-`tools/call` MCP request
- **THEN** the gateway SHALL forward the traffic according to the wrapped
  descriptor transport.

### Requirement: Passive gateway SHALL preserve MCP behavior

Outside active smoke short-circuiting, the gateway SHALL act as a transparent
passthrough for MCP traffic.

#### Scenario: HTTP request is equivalent to direct MCP

- **GIVEN** no smoke span is active for the connection
- **WHEN** the ACP agent sends an MCP HTTP request through the gateway
- **THEN** the gateway SHALL forward the request to the original endpoint
- **AND** it SHALL return the upstream status, headers relevant to MCP behavior,
  and body without using diagnostics to change the result.

#### Scenario: Large HTTP response is not diagnostic-buffered

- **GIVEN** no smoke span is active for the connection
- **WHEN** the upstream MCP server returns a large response body
- **THEN** the gateway SHALL stream or otherwise forward the response without
  requiring full-body diagnostic buffering before the agent can receive it.

#### Scenario: Stdio request is forwarded after smoke

- **GIVEN** a stdio descriptor is wrapped by the shim
- **AND** no active smoke span requires short-circuiting
- **WHEN** the ACP agent sends `tools/call`
- **THEN** the shim SHALL forward the JSON-RPC request to the real stdio MCP
  child process.

### Requirement: Stdio shim SHALL preserve process semantics

The stdio gateway shim SHALL proxy the wrapped child process without hiding
normal stdio lifecycle signals.

#### Scenario: Stderr and exit are preserved

- **GIVEN** the wrapped stdio MCP child writes stderr and exits
- **WHEN** the shim is running
- **THEN** the shim SHALL forward stderr for diagnostics
- **AND** it SHALL propagate child exit status in a way the ACP backend can
  observe.

#### Scenario: Stdin close is propagated

- **GIVEN** the ACP backend closes stdin for the shim
- **WHEN** the shim has a running child process
- **THEN** the shim SHALL close the child stdin and allow the child to exit
  normally.

#### Scenario: Shim startup is unavailable

- **GIVEN** a stdio descriptor must be wrapped
- **AND** the host cannot resolve or start the stdio shim runtime
- **WHEN** the ACP session is prepared
- **THEN** the runner SHALL fail the MCP gateway setup with
  `stdio_gateway_unavailable`
- **AND** it SHALL NOT fall back to transcript-based smoke decisions.
