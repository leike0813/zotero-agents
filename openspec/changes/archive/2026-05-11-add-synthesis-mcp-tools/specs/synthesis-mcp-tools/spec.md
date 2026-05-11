# synthesis-mcp-tools Delta

## ADDED Requirements

### Requirement: Synthesis job-time tools are exposed through embedded MCP

The embedded Zotero MCP protocol SHALL expose read-only Synthesis job-time tools
for ACP Skills agents.

#### Scenario: Tools are listed

- **WHEN** an MCP client calls `tools/list`
- **THEN** Synthesis job-time tools SHALL appear with names beginning
  `synthesis.`
- **AND** they SHALL use JSON object input schemas.

### Requirement: Synthesis MCP uses a DTO service boundary

Synthesis MCP tools SHALL call an injectable service boundary and SHALL NOT
expose raw Zotero objects.

#### Scenario: Tool is called

- **WHEN** a Synthesis MCP tool is called
- **THEN** the protocol handler SHALL route the validated args to the matching
  Synthesis service method
- **AND** return structured DTO content.

### Requirement: Synthesis MCP tools are read-only

Synthesis MCP v1 SHALL NOT provide tools that formally write Synthesis assets.

#### Scenario: Agent needs to persist synthesis output

- **WHEN** an agent finishes synthesis generation
- **THEN** formal persistence SHALL remain outside Synthesis MCP
- **AND** later workflow result bundle/applyResult SHALL perform the write.

### Requirement: Synthesis MCP inputs are strict

Synthesis MCP inputs SHALL reject unknown top-level fields.

#### Scenario: Unknown arg is supplied

- **WHEN** a Synthesis tool call contains an unknown top-level argument
- **THEN** the MCP handler SHALL reject the call with an invalid parameter error.
