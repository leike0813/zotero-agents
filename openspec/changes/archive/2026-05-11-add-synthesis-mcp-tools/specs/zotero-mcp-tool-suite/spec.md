# zotero-mcp-tool-suite Delta

## MODIFIED Requirements

### Requirement: Agent-facing MCP text disclosures are actionable

Zotero MCP tool results SHALL include agent-readable text that enables follow-up
calls without relying on hidden structured fields alone.

#### Scenario: Synthesis tools return DTOs

- **WHEN** a Synthesis MCP tool returns topic, resolver, registry, graph, or
  artifact DTOs
- **THEN** `content[0].text` SHALL include actionable identifiers, counts,
  cursor state, or paper refs relevant to follow-up calls
- **AND** structured content SHALL contain the same DTO payload.
