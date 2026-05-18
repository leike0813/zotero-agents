# zotero-mcp-tool-suite

## ADDED Requirements

### Requirement: Tool contracts include enforceable validation metadata

Public Zotero MCP tool definitions SHALL include schema constraints that the
server enforces before executing handlers.

#### Scenario: Tool list exposes bounded schemas

- **WHEN** an MCP client calls `tools/list`
- **THEN** tool schemas SHALL include `additionalProperties=false`
- **AND** bounded fields SHALL declare applicable enum, length, item, or numeric
  constraints.

### Requirement: Tool results expose stable error metadata

Known tool execution failures SHALL expose stable error fields for agent retry
and correction decisions.

#### Scenario: Tool returns recoverable failure

- **WHEN** a tool returns `isError=true`
- **THEN** structured content SHALL include the tool name, stable error code,
  retryable flag, and optional retry-after milliseconds.
