## MODIFIED Requirements

### Requirement: Host Bridge current view capability SHALL be available
The embedded MCP server SHALL expose read-only Host Bridge capabilities as MCP
tools using the exact current Host Bridge capability names.

#### Scenario: MCP mirrors renamed Host Bridge namespaces
- **WHEN** an MCP client lists tools
- **THEN** the listed Host Bridge tools SHALL include renamed domain capability
  names such as `topics.list`, `citation_graph.get_metrics`,
  `paper_artifacts.export_filtered`, and `insights.get_attention_queue`
- **AND** the tool list SHALL NOT include old public `synthesis.*` capability
  names.
