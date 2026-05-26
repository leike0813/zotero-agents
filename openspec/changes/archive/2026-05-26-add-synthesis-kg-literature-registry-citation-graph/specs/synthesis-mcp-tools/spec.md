## MODIFIED Requirements

### Requirement: Synthesis registry reads are paged

`synthesis.get_paper_registry` SHALL support bounded paper registry reads from canonical-backed projection state.

#### Scenario: Registry page is requested

- **WHEN** a client calls `synthesis.get_paper_registry` with `cursor` and `limit`
- **THEN** the result SHALL include a bounded row page, `cursor`, `next_cursor`, `has_more`, `returned`, and `total`
- **AND** rows SHALL come from the canonical-backed registry projection when available.

### Requirement: Citation graph metrics are available through bounded MCP

The embedded Zotero MCP protocol SHALL expose read-only `synthesis.get_citation_graph_metrics` values from canonical-backed citation graph projections.

#### Scenario: Metrics projection is stale

- **WHEN** a caller requests citation graph metrics and the projection is missing or stale
- **THEN** the MCP response SHALL report structured missing or stale diagnostics
- **AND** it SHALL NOT return raw Zotero objects or an unbounded full graph.

### Requirement: Synthesis MCP tools are read-only

Synthesis MCP tools SHALL expose read-only host capabilities for synthesis and review workflow jobs.

#### Scenario: Canonical-backed graph tools are listed

- **WHEN** an MCP client lists Synthesis tools
- **THEN** existing paper registry, citation graph slice, and citation graph metrics tools SHALL remain read-only
- **AND** no cleanup write tool SHALL be exposed through MCP in this phase.
