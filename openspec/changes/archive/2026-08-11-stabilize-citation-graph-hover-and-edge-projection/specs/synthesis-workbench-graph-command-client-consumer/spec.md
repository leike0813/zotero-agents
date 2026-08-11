## MODIFIED Requirements

### Requirement: Workbench SHALL load Citation Graph pages incrementally
The Workbench SHALL render the first bounded Graph page and then request continuation pages serially while the Graph tab and current generation remain active. It SHALL merge nodes and edges by stable ID without rebuilding the graph canvas or managed control and selection regions, SHALL preserve valid graph interaction state across same-query page merges, and SHALL derive external-node visibility from the distinct currently visible library sources accumulated for the active projection.

#### Scenario: Background loading completes within the soft limit
- **WHEN** the active graph contains 7,432 nodes and 11,377 edges under the current query
- **THEN** the Workbench automatically loads the complete graph and reports complete progress

#### Scenario: A page arrives
- **WHEN** a valid continuation page is merged
- **THEN** existing Sigma canvas, camera, selection, focus, control drawer, and selection drawer identities are preserved
- **AND** a hovered node that remains visible keeps its title and incident-edge presentation
- **AND** a selected node and a distinct hovered node retain the union of their neighborhoods.

#### Scenario: External source edges arrive on separate pages
- **WHEN** an external or unresolved node and its first incoming edge from a visible library source have arrived
- **THEN** the Workbench SHALL keep that external neighborhood hover-only
- **WHEN** an incoming edge from a second distinct visible library source arrives for the same node
- **THEN** the Workbench SHALL promote the node and its qualifying incoming edges into the default projection without replacing the graph canvas
- **AND** the promoted edges SHALL remain hidden until their node neighborhood is hovered or selected

#### Scenario: Repeated evidence from one source arrives
- **WHEN** multiple edges or reference mentions from the same visible library source target one external or unresolved node
- **THEN** they SHALL count as one source for projection visibility

#### Scenario: Initial standalone projection matches subsequent projection
- **WHEN** a standalone Citation Graph envelope is opened before any control interaction
- **THEN** the Workbench SHALL derive its default and hover-only partitions from the complete graph using the active filters
- **AND** applying the same filters again SHALL NOT change those partitions

#### Scenario: A neighborhood slice is merged during continuation loading
- **WHEN** a user expands a node while continuation pages are loading
- **THEN** optional filters with no value SHALL be absent from the slice request
- **AND** the slice SHALL preserve existing node coordinates and the active page request owner
- **AND** continuation loading SHALL continue for the same graph generation.

#### Scenario: Concurrent layout requests target one basis
- **WHEN** automatic and explicit paths request the same graph hash and layout algorithm
- **THEN** the host SHALL run at most one layout mutation and observe it to a terminal state
- **AND** `graph_application_busy` SHALL be treated as non-fatal contention
- **AND** an older Running response SHALL NOT overwrite a newer terminal response.

#### Scenario: Multiple Workbench frames share a host window
- **WHEN** a frame posts a Workbench action through the fallback message bridge
- **THEN** only the runtime whose exact frame window sent the event SHALL handle it.
