## ADDED Requirements

### Requirement: Workbench citation graph aggregates source-target evidence before display selection

The Citation Graph read model SHALL expose at most one citation edge for each source-target pair, and it SHALL derive an external target's incoming degree from distinct library source nodes rather than raw reference instances.

#### Scenario: One library paper repeats an external reference

- **WHEN** one library source paper contains multiple reference instances that resolve to the same external target
- **THEN** the read model SHALL expose one source-target edge with accumulated mention, role, and source-reference evidence
- **AND** the external target SHALL have incoming degree one
- **AND** the target and edge SHALL remain hover-only and SHALL NOT participate in default layout computation.

#### Scenario: Multiple library papers share an external reference

- **WHEN** at least two distinct library source papers cite the same external target
- **THEN** the external target SHALL have incoming degree equal to the number of distinct library sources
- **AND** the target SHALL participate in the default graph and layout
- **AND** repeated references from one source SHALL increase only that source-target edge's mention evidence.

#### Scenario: Raw reference provenance is retained

- **WHEN** multiple raw reference instances are aggregated into one graph edge
- **THEN** the persisted reference-instance records SHALL remain unchanged
- **AND** the graph edge SHALL retain the contributing source references and accumulated role evidence.
