## ADDED Requirements

### Requirement: Synthesis MCP reads do not trigger maintenance work

Synthesis MCP read-only tools SHALL NOT enqueue rebuild jobs, write projection
state, write durable job state, or schedule retries.

#### Scenario: Paper registry projection is stale

- **WHEN** an MCP client calls `synthesis.get_paper_registry` and the registry
  projection is stale
- **THEN** the response SHALL include bounded rows or diagnostics
- **AND** no registry rebuild job SHALL be enqueued by that call.

#### Scenario: Citation graph projection is missing

- **WHEN** an MCP client calls `synthesis.get_citation_graph_slice` or
  `synthesis.get_citation_graph_metrics` and projection state is missing
- **THEN** the response SHALL be bounded and diagnostic
- **AND** no graph rebuild or layout job SHALL start from that read.

### Requirement: Synthesis MCP exposes freshness without raw state

Synthesis MCP read results SHALL expose freshness and latest usable state
without returning raw Zotero objects or unbounded graph data.

#### Scenario: Stale data is returned

- **WHEN** an MCP read returns stale-but-usable Synthesis data
- **THEN** the DTO SHALL indicate stale or partial status
- **AND** it SHALL include an explicit recommended host command when available.
