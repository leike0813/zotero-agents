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
- **AND** permission handling, queueing, summaries, structured content, and errors SHALL remain unchanged

### Requirement: MCP compatibility constants remain stable

Public `ZOTERO_MCP_TOOL_*` constants SHALL retain their exported names and values even when the unreachable legacy registry is removed.

#### Scenario: Existing caller imports a tool constant
- **WHEN** production or test code imports an existing public MCP tool-name constant
- **THEN** the constant SHALL remain available with its current capability-name value
