## ADDED Requirements

### Requirement: Topic-scoped citation graph UI
The Synthesis Workbench SHALL let users scope the Citation Graph to an existing materialized topic.

#### Scenario: Select topic scope from graph controls
- **GIVEN** the graph snapshot contains topic scope rows
- **WHEN** the user selects a topic in Citation Graph controls
- **THEN** the graph view SHALL display that topic's fixed 1-hop citation subgraph
- **AND** selecting `All topics` SHALL restore the full citation graph.

#### Scenario: Jump from topic details
- **GIVEN** a topic detail page is open
- **WHEN** the user clicks `Open Citation Subgraph`
- **THEN** the workbench SHALL switch to Citation Graph scoped to that topic
- **AND** the graph view SHALL expose `Back to Topic Details`.

### Requirement: Topic scope read model
The graph snapshot SHALL expose topic scope rows built from real topic artifact paper refs and citation graph node ids.

#### Scenario: Missing graph nodes
- **GIVEN** a topic has source paper refs that are absent from the citation graph cache
- **WHEN** the user selects that topic scope
- **THEN** the graph SHALL show an empty scoped state with diagnostics
- **AND** it SHALL NOT fall back to the full graph.
