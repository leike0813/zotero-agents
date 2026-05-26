## MODIFIED Requirements

### Requirement: Citation graph rebuild persists metrics

Citation graph rebuild SHALL persist graph, layout, and metrics snapshots together as rebuildable projection DTOs derived from canonical literature registry records.

#### Scenario: Graph is rebuilt

- **WHEN** `queryCitationGraph()` rebuilds the graph
- **THEN** `synthesis/state/citation-graph-index.json`, metrics, and layout projection files SHALL be written
- **AND** the metrics snapshot SHALL record the current `graph_hash`
- **AND** latest usable snapshot state SHALL be updated.

#### Scenario: Metrics are stale

- **WHEN** persisted metrics exist but their `graph_hash` differs from the persisted graph
- **THEN** metrics reads SHALL report stale status instead of returning misleading ready data.

### Requirement: Citation graph is deterministic and plugin-owned

Unified Citation Graph SHALL be built by deterministic plugin code from canonical literature registry records and SHALL NOT depend on LLM inference.

#### Scenario: Graph is built from canonical papers and references

- **WHEN** canonical paper and reference instance records are available
- **THEN** the graph SHALL contain library paper nodes, target reference nodes, and citation edges directed from citing paper to cited target
- **AND** repeated rebuilds from the same canonical records SHALL produce the same graph hash.
