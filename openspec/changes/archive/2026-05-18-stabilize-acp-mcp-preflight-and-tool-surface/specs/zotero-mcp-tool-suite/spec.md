# zotero-mcp-tool-suite

## ADDED Requirements

### Requirement: ACP required MCP tools are preflighted before prompting

The ACP SkillRunner-compatible runner SHALL preflight runner-declared MCP tools
before sending the first prompt to an ACP agent.

#### Scenario: HTTP MCP is unavailable

- **GIVEN** a skill runner manifest declares `mcp.required_tools`
- **AND** the ACP backend does not advertise HTTP MCP support
- **WHEN** the ACP skill run starts
- **THEN** the run SHALL fail before `newSession` or `prompt`
- **AND** the failure SHALL list the required MCP tools.

#### Scenario: Required tool is missing

- **GIVEN** a skill runner manifest declares `mcp.required_tools`
- **AND** the embedded Zotero MCP tool registry does not contain one required
  tool
- **WHEN** the ACP skill run starts
- **THEN** the run SHALL fail before the first prompt
- **AND** the error SHALL name the missing tool.

### Requirement: High-risk artifact read tool is not public

The Zotero MCP tool registry SHALL NOT expose
`synthesis.read_paper_artifacts` as a public tool.

#### Scenario: Tool listing excludes read_paper_artifacts

- **WHEN** an MCP client calls `tools/list`
- **THEN** the returned tool names SHALL NOT include
  `synthesis.read_paper_artifacts`.

#### Scenario: Direct call is rejected

- **WHEN** an MCP client calls `tools/call` with
  `synthesis.read_paper_artifacts`
- **THEN** the response SHALL be an unknown-tool JSON-RPC error.
