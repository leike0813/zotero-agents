# zotero-mcp-tool-suite

## ADDED Requirements

### Requirement: Zotero MCP tool listing exposes current synthesis tools

The Zotero MCP server SHALL list only the current public synthesis tools.

#### Scenario: Filtered artifact export replaces bundle export

- **WHEN** an MCP client calls `tools/list`
- **THEN** the returned tool names SHALL include
  `synthesis.export_filtered_paper_artifacts`
- **AND** SHALL NOT include `synthesis.export_paper_artifact_bundle`.

#### Scenario: Unknown old export tool is rejected

- **WHEN** an MCP client calls `synthesis.export_paper_artifact_bundle`
- **THEN** the MCP protocol SHALL return a tool-not-found error.
