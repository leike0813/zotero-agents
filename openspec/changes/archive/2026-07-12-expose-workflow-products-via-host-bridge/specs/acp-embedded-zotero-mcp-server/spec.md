## ADDED Requirements

### Requirement: MCP mirrors read-only workflow-product capabilities only
The embedded MCP server SHALL expose `workflow_products.list`,
`workflow_products.get`, and `workflow_products.read_asset` with their exact
Host Bridge names, while excluding product export and product removal.

#### Scenario: MCP client lists product tools
- **WHEN** an MCP client calls `tools/list`
- **THEN** the tools list SHALL include the three read-only workflow-product
  capabilities
- **AND** it SHALL not include `workflow_products.export` or
  `workflow_products.remove`.
