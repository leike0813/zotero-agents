# zotero-mcp-host-bridge-capability-catalog Specification

## Purpose
Defines the zotero mcp host bridge capability catalog capability for the Synthesis plugin, specifying its service boundary, integration contracts, and runtime behavior.

## Requirements

### Requirement: MCP uses the Host Bridge capability catalog exclusively

MCP `tools/list` and `tools/call` SHALL derive tool definitions and handlers from the Host Bridge capability catalog. Production MCP protocol code SHALL NOT contain or consult a separate legacy tool registry or direct Synthesis service dispatcher.

#### Scenario: MCP client lists tools
- **WHEN** an MCP client calls `tools/list`
- **THEN** returned tool names, descriptions, and schemas SHALL be derived from current Host Bridge capabilities
- **AND** the existing read-only workflow-product exclusions SHALL remain in force

#### Scenario: MCP client calls a Synthesis tool
- **WHEN** an MCP client calls a mirrored Synthesis capability
- **THEN** MCP SHALL invoke the Host Bridge capability handler with local connection mode
- **AND** permission handling, summaries, structured content, and errors SHALL retain their domain semantics; request-scoped trusted call control SHALL flow to the same handler and transport inflight admission SHALL remain separate from Broker native-slice serialization

### Requirement: MCP compatibility constants remain stable

Public `ZOTERO_MCP_TOOL_*` constants SHALL retain their exported names and values even when the unreachable legacy registry is removed.

#### Scenario: Existing caller imports a tool constant
- **WHEN** production or test code imports an existing public MCP tool-name constant
- **THEN** the constant SHALL remain available with its current capability-name value

### Requirement: MCP SHALL mirror Saved Search discovery
The canonical library.list_saved_searches capability SHALL appear in MCP discovery and calls through the same Host Bridge schema and handler, without a separate discovery implementation.

#### Scenario: MCP discovers Saved Searches
- **WHEN** a client lists and calls the Saved Search tool
- **THEN** the advertised and executed page contract matches Host Bridge.

### Requirement: MCP navigation exposure SHALL use request scope admission

MCP SHALL mirror the seven Host Bridge navigation capabilities and derive their
schemas and handlers from the same registry. Each HTTP request SHALL parse
`X-Zotero-Bridge-Scope` once. Missing or `global` scope SHALL be operator,
`acp-chat` SHALL be interactive, the three run scopes SHALL be automated and
denied, and malformed or unknown non-empty values SHALL be invalid and denied.

#### Scenario: Eligible caller lists and calls navigation
- **WHEN** an operator or `acp-chat` request lists or calls MCP tools
- **THEN** the seven navigation tools are discoverable and invoke the mirrored Host Bridge handler.

#### Scenario: Automated caller is denied
- **WHEN** an automated scope calls `tools/list` or `tools/call`
- **THEN** navigation tools are hidden from the list and the call is rejected before Broker invocation.

#### Scenario: Scope header is malformed
- **WHEN** a request supplies an unknown or malformed non-empty scope
- **THEN** MCP rejects the request as invalid
- **AND** it does not default to operator access.
