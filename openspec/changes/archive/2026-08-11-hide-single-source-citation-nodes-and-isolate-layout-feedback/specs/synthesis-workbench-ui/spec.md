## MODIFIED Requirements

### Requirement: Workbench separates graph data rebuild from layout rebuild
Workbench SHALL present Citation Graph cache rebuild and Citation Graph layout rebuild as separate operations. Its visible Citation Graph projection SHALL retain library nodes without edges. It SHALL keep an external or unresolved node hidden with fewer than two distinct currently visible library sources and admit it to the default projection only with at least two distinct currently visible library sources. Hidden rows SHALL remain available to graph details and SHALL NOT enter visual or layout topology in any interaction state.

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
- **AND** edges incident to the selected node, the pointer-hovered node, or an explicitly selected edge SHALL be visible only when both endpoints belong to the default projection
- **AND** selected and pointer-hovered neighborhoods SHALL be rendered as a union
- **AND** hovering any visible node while another node is selected SHALL show the hovered node title without changing the selection.

#### Scenario: Selection and pointer hover overlap
- **WHEN** one visible node is selected and the pointer hovers another visible node
- **THEN** Workbench SHALL retain both nodes' eligible default-projection incident edges
- **AND** leaving the pointer-hovered node SHALL remove only its transient edge emphasis
- **AND** the selected node SHALL continue to own the selection drawer
- **AND** neither interaction SHALL change the graph topology.

#### Scenario: A halo node is pointer-hovered
- **WHEN** the pointer hovers a current-paper or importance-halo node
- **THEN** Workbench SHALL draw both its halo and its title.

#### Scenario: Hover remains stable while pages arrive
- **WHEN** a continuation page for the current Graph query arrives while a visible node is hovered
- **THEN** the hovered node title and its incident default-projection edges SHALL remain visible without requiring the pointer to leave and re-enter the node.

#### Scenario: An external node has no visible library source
- **WHEN** an external or unresolved node has no incoming edge from a currently visible library node
- **THEN** Workbench SHALL exclude that node and its edges from the visual and layout projections
- **AND** it SHALL retain the underlying rows for details.

#### Scenario: An external node has one visible library source
- **WHEN** exactly one distinct currently visible library node cites an external or unresolved node
- **THEN** Workbench SHALL exclude that external node and its qualifying edges from the visual and layout projections at rest, on hover, and on selection
- **AND** the source-node details SHALL retain the hidden target and citation evidence.

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
- **THEN** external or unresolved nodes with fewer than two distinct visible library sources SHALL remain absent at rest, on hover, and on selection
- **AND** the fallback SHALL render no edge at rest
- **AND** interaction SHALL reveal only incident edges whose endpoints both belong to the default projection.

#### Scenario: Graph cache is ready but layout is missing
- **WHEN** graph data exists but layout coordinates are missing or dirty
- **THEN** the primary action MAY run `manualRecomputeLayout`
- **AND** it SHALL NOT imply graph data refresh.

### Requirement: Workbench UI renders stable surface containers
Synthesis Workbench UI SHALL keep stable containers for each surface and update only the affected container for surface-local changes.

#### Scenario: Local review decision is queued
- **WHEN** the user queues or cancels a reference review decision
- **THEN** only Review/Index review surfaces and chrome MAY update
- **AND** the Workbench SHALL NOT rebuild the whole DOM.

#### Scenario: Shell-level navigation changes
- **WHEN** the selected top-level tab changes
- **THEN** shell navigation MAY update
- **AND** already mounted unrelated surface containers SHALL NOT be rebuilt because of data refresh elsewhere.

#### Scenario: Citation Graph selection changes
- **WHEN** a node or edge selection changes without a graph content change
- **THEN** Workbench SHALL update only graph interaction presentation and details
- **AND** it SHALL preserve canvas, camera, controls, and layout-region identity.

### Requirement: Workbench SHALL render a bounded, endpoint-closed Citation Graph interaction topology

After active filters and distinct-source visibility projection, Workbench SHALL collapse parallel raw citation records into one directed visual edge per source-target pair while preserving raw records for details. Every visual edge SHALL have both endpoints in the default projection, and hover or selection SHALL NOT add nodes or edges to the visual topology.

#### Scenario: Parallel citation records share endpoints
- **WHEN** multiple filtered citation records have the same source and target
- **THEN** Workbench SHALL render one visual edge whose count is their normalized sum
- **AND** it SHALL preserve the raw records for details.

#### Scenario: A graph node is selected
- **WHEN** Workbench renders the node detail drawer
- **THEN** it SHALL separately report distinct incoming library source papers and incoming citation records for the current loaded view
- **AND** it SHALL include supplemental hidden citation targets without adding them to the visual topology.

### Requirement: Workbench SHALL describe Citation Graph layout activity truthfully

The host SHALL own layout mutations and SHALL coalesce requests for the same graph hash and algorithm. Rendering, hovering, selection, and details interaction SHALL NOT trigger layout mutation. The in-graph layout banner SHALL appear only when the current graph has no usable coordinates; after usable coordinates exist, later layout progress SHALL be non-blocking status feedback while the last usable graph remains interactive.

#### Scenario: Layout state is not running
- **WHEN** layout state is missing, stale, ready, or failed
- **THEN** Workbench SHALL NOT describe it as refreshing.

#### Scenario: Selection arrives after layout is ready
- **WHEN** a selection-only surface update arrives after finite graph coordinates are available
- **THEN** Workbench SHALL preserve the rendered graph
- **AND** it SHALL NOT show or recreate the in-graph layout banner.

#### Scenario: Layout recomputes after usable coordinates exist
- **WHEN** an explicit redraw, query change, or graph data change starts a new layout while usable coordinates remain available
- **THEN** Workbench SHALL keep the last usable graph interactive
- **AND** it SHALL report progress through non-blocking status feedback rather than the in-graph layout banner.

