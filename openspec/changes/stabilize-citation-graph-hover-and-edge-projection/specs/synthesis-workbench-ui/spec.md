## MODIFIED Requirements

### Requirement: Workbench separates graph data rebuild from layout rebuild
Workbench SHALL present Citation Graph cache rebuild and Citation Graph layout rebuild as separate operations. Its visible Citation Graph projection SHALL retain library nodes without edges. It SHALL keep an external or unresolved node hidden with no currently visible library source, expose it only through the source's hover neighborhood with one distinct currently visible library source, and admit it to the default projection only with at least two distinct currently visible library sources.

#### Scenario: Graph cache is missing
- **WHEN** Graph tab has missing graph cache basis
- **THEN** the primary action SHALL run `rebuildCitationGraphCacheNow`
- **AND** it SHALL NOT run `manualRecomputeLayout`.

#### Scenario: Stale graph rows remain usable
- **WHEN** Graph tab has a stale graph cache basis
- **AND** cached graph rows are still available
- **THEN** Workbench SHALL render the latest usable graph with a cache diagnostic
- **AND** it SHALL offer `refreshCitationGraphCacheIncrementalNow` when stale delta metadata is available
- **AND** it SHALL NOT replace the graph with the no-data state.

#### Scenario: Graph search is explicit
- **WHEN** a user types in the Graph search control
- **THEN** Workbench SHALL NOT refresh Graph filters until Search is submitted
- **AND** Clear SHALL reset Graph search immediately.

#### Scenario: Graph direction and hover labels are visible
- **WHEN** Citation Graph edges are rendered
- **THEN** Workbench SHALL use directed edge rendering and target-tinted edge color
- **AND** every edge SHALL remain hidden without hover or selection
- **AND** edges incident to the selected node, the pointer-hovered node, or an explicitly selected edge SHALL be visible
- **AND** selected and pointer-hovered neighborhoods SHALL be rendered as a union
- **AND** hovering any visible node while another node is selected SHALL show the hovered node title without changing the selection.

#### Scenario: Selection and pointer hover overlap
- **WHEN** one node is selected and the pointer hovers another node
- **THEN** Workbench SHALL retain both nodes' eligible one-source neighborhoods and incident edges
- **AND** leaving the pointer-hovered node SHALL remove only its transient neighborhood
- **AND** the selected node SHALL continue to own the selection drawer.

#### Scenario: A halo node is pointer-hovered
- **WHEN** the pointer hovers a current-paper or importance-halo node
- **THEN** Workbench SHALL draw both its halo and its title.

#### Scenario: Hover remains stable while pages arrive
- **WHEN** a continuation page for the current Graph query arrives while a visible node is hovered
- **THEN** the hovered node title and its incident edges SHALL remain visible without requiring the pointer to leave and re-enter the node.

#### Scenario: An external node has no visible library source
- **WHEN** an external or unresolved node has no incoming edge from a currently visible library node
- **THEN** Workbench SHALL exclude that node and its edges from both the default and hover-only projections.

#### Scenario: An external node has one visible library source
- **WHEN** exactly one distinct currently visible library node cites an external or unresolved node
- **THEN** Workbench SHALL exclude that external node from the default projection
- **AND** it SHALL materialize the node and its qualifying edge only while the visible library source is hovered or selected.

#### Scenario: An external node has two visible library sources
- **WHEN** at least two distinct currently visible library nodes cite an external or unresolved node
- **THEN** Workbench SHALL retain that external node in the default projection
- **AND** it SHALL retain every qualifying incoming edge from those visible library sources
- **AND** those retained edges SHALL remain interaction-scoped
- **AND** repeated mentions or parallel evidence from one library source SHALL NOT increase the distinct-source count.

#### Scenario: A library node has no visible edge
- **WHEN** a library node has no edge under the current visible projection
- **THEN** Workbench SHALL retain the library node.

#### Scenario: SVG fallback applies the shared projection
- **WHEN** the constrained standalone renderer uses its SVG fallback
- **THEN** zero-source external nodes SHALL be omitted and one-source external nodes SHALL be absent at rest
- **AND** hovering a visible library source SHALL temporarily materialize only its eligible one-source neighbors and incident edges
- **AND** the fallback SHALL render no edge at rest.

#### Scenario: Graph cache is ready but layout is missing
- **WHEN** graph data exists but layout coordinates are missing or dirty
- **THEN** the primary action MAY run `manualRecomputeLayout`
- **AND** it SHALL NOT imply graph data refresh.

#### Scenario: Parallel citation records share endpoints
- **WHEN** multiple filtered raw citation records have the same source and target
- **THEN** every renderer SHALL materialize one visual edge for that endpoint pair
- **AND** its citation count SHALL equal the normalized sum of the source records
- **AND** interaction-only nodes SHALL never remain visible without an incident visual edge.

#### Scenario: An interaction owner has a large private neighborhood
- **WHEN** a selected or pointer-hovered node has more than 100 eligible interaction-only neighbors
- **THEN** Workbench SHALL materialize a deterministic top 100 for that owner
- **AND** it SHALL place them with screen-relative separation that preserves pointer access to the owner node.

#### Scenario: Citation details distinguish source papers from records
- **WHEN** a node is selected
- **THEN** Workbench SHALL report both distinct incoming source papers and normalized incoming citation records for the current loaded view.

#### Scenario: Layout state is observed
- **WHEN** a layout is already ready or refreshing for the active graph hash and algorithm
- **THEN** rendering and node selection SHALL NOT start another recomputation
- **AND** only an actual refreshing state SHALL be described as refreshing.
