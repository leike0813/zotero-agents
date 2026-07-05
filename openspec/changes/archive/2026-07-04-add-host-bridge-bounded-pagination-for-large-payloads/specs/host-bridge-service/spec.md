## ADDED Requirements

### Requirement: Host Bridge read capabilities bound high-cardinality responses

The Host Bridge SHALL return page-sized or otherwise explicitly bounded JSON
responses for public non-debug read capabilities that can grow with Zotero
library or Synthesis graph size.

#### Scenario: Citation graph overview is paged
- **WHEN** a client calls `citation_graph.get_overview`
- **THEN** the response SHALL include summary, diagnostics, maintenance, and
  graph hash metadata
- **AND** `nodes`, `edges`, `hover_only_nodes`, and `hover_only_edges` SHALL be
  page-sized arrays
- **AND** the response SHALL include section-level pagination metadata for each
  graph array.

#### Scenario: Large read capability remains parseable
- **WHEN** a client calls a high-cardinality read capability
- **THEN** the Host Bridge response SHALL be a complete JSON object for one
  page or bounded result
- **AND** callers SHALL be able to continue through cursor metadata when more
  results exist.

#### Scenario: Cluster queries remain selector bounded
- **WHEN** a client calls `citation_graph.query_cluster`
- **THEN** the service MAY inspect the cached graph internally
- **AND** returned nodes and edges SHALL be bounded and report truncation
  diagnostics when limits are reached.
