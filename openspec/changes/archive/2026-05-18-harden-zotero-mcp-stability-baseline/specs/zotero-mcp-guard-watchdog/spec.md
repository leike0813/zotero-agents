# zotero-mcp-guard-watchdog

## ADDED Requirements

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
