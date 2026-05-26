## ADDED Requirements

### Requirement: Synthesis MCP read-only tools handle stale literature projections

Synthesis MCP read-only registry and citation graph tools SHALL keep responses bounded when literature projections are stale or missing.

#### Scenario: Projection is stale

- **WHEN** a registry, graph, or metrics tool reads a stale projection
- **THEN** it SHALL include bounded diagnostics
- **AND** it SHALL NOT return raw Zotero objects or unbounded full graph payloads.
