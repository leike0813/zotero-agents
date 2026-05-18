# zotero-mcp-concurrency-queue-policy

## ADDED Requirements

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
