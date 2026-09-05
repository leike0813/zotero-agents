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
