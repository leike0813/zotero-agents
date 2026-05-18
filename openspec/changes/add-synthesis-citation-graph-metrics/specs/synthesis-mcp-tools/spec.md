# synthesis-mcp-tools

## ADDED Requirements

### Requirement: Citation graph metrics are available through bounded MCP

The embedded Zotero MCP protocol SHALL expose a read-only
`synthesis.get_citation_graph_metrics` tool for bounded library-paper graph
metrics.

#### Scenario: Metrics tool is listed

- **WHEN** an MCP client calls `tools/list`
- **THEN** `synthesis.get_citation_graph_metrics` SHALL be present.

#### Scenario: Metrics tool is called

- **WHEN** an MCP client calls `synthesis.get_citation_graph_metrics`
- **THEN** the MCP layer SHALL route to the Synthesis service
- **AND** return a bounded DTO without returning the full citation graph.

#### Scenario: Metrics are filtered by paper refs

- **WHEN** a caller supplies `paperRefs`
- **THEN** the result SHALL include metrics rows only for matching library paper
  nodes.
