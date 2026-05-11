# synthesis-mcp-tools Delta

## MODIFIED Requirements

### Requirement: Synthesis MCP tools are read-only

Synthesis MCP tools SHALL expose read-only host capabilities for synthesis and
review workflow jobs.

#### Scenario: Review input tool is listed

- **WHEN** an MCP client lists tools
- **THEN** `synthesis.get_review_input` SHALL be present
- **AND** no formal write tool SHALL be added.

#### Scenario: Review input tool is called

- **WHEN** an MCP client calls `synthesis.get_review_input`
- **THEN** the MCP layer SHALL route to the injected Synthesis service
- **AND** it SHALL return structured content without writing assets.
