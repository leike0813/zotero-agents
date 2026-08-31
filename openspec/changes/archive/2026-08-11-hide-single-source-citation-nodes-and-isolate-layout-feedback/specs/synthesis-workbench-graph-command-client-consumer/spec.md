## MODIFIED Requirements

### Requirement: Workbench graph reads SHALL receive a renderable native projection

`getSynthesisWorkbenchSurfaceInput` for `graph` SHALL return an explicit graph object containing the active graph hash, public UI nodes and edges, supplemental single-source rows, layout status, diagnostics, and topic scopes. Missing fields SHALL NOT be used to represent a rebuilt graph. Supplemental single-source rows SHALL remain data-only inputs for details and SHALL NOT be promoted by hover or selection.

#### Scenario: Rebuild succeeds before layout exists
- **WHEN** Workbench refreshes the graph surface after a successful rebuild
- **THEN** nodes and edges render immediately with layout status `missing` or `stale`
- **AND** the existing bounded auto-layout path may request one recomputation.

#### Scenario: Layout recomputation succeeds
- **WHEN** Workbench refreshes the same graph and the normalized layout is ready
- **THEN** every displayed node receives finite coordinates
- **AND** the ready layout does not trigger another automatic recomputation.

#### Scenario: Supplemental single-source rows are returned
- **WHEN** the native graph surface includes an external node cited by exactly one distinct visible library source
- **THEN** the row remains available to details and counts
- **AND** the client SHALL NOT add the node or its edge to the visual or layout projection.

### Requirement: Workbench SHALL load Citation Graph pages incrementally
The Workbench SHALL render the first bounded Graph page and then request continuation pages serially while the Graph tab and current generation remain active. It SHALL merge nodes and edges by stable ID without rebuilding the graph canvas or managed control and selection regions, SHALL preserve valid graph interaction state across same-query page merges, and SHALL derive external-node visibility from the distinct currently visible library sources accumulated for the active projection. External nodes with fewer than two distinct visible library sources SHALL remain supplemental data in every interaction state.

#### Scenario: Background loading completes within the soft limit
- **WHEN** the active graph contains 7,432 nodes and 11,377 edges under the current query
- **THEN** the Workbench automatically loads the complete graph and reports complete progress.

#### Scenario: A page arrives
- **WHEN** a valid continuation page is merged
- **THEN** existing Sigma canvas, camera, selection, focus, control drawer, and selection drawer identities are preserved
- **AND** a hovered node that remains visible keeps its title and incident-edge presentation
- **AND** a selected node and a distinct hovered node retain the union of their default-projection edge emphasis.

#### Scenario: External source edges arrive on separate pages
- **WHEN** an external or unresolved node and its first incoming edge from a visible library source have arrived
- **THEN** the Workbench SHALL keep that external node and edge out of the visual and layout projections in every interaction state
- **WHEN** an incoming edge from a second distinct visible library source arrives for the same node
- **THEN** the Workbench SHALL promote the node and its qualifying incoming edges into the default projection without replacing the graph canvas
- **AND** the promoted edges SHALL remain hidden until their default-projection neighborhood is hovered or selected.

#### Scenario: Repeated evidence from one source arrives
- **WHEN** multiple edges or reference mentions from the same visible library source target one external or unresolved node
- **THEN** they SHALL count as one source for projection visibility.

#### Scenario: Initial standalone projection matches subsequent projection
- **WHEN** a standalone Citation Graph envelope is opened before any control interaction
- **THEN** the Workbench SHALL derive its default and supplemental single-source partitions from the complete graph using the active filters
- **AND** applying the same filters again SHALL NOT change those partitions.

