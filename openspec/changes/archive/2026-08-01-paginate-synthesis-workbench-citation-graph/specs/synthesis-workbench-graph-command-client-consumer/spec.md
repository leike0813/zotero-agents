## ADDED Requirements

### Requirement: Workbench SHALL load Citation Graph pages incrementally
The Workbench SHALL render the first bounded Graph page and then request continuation pages serially while the Graph tab and current generation remain active. It SHALL merge nodes and edges by stable ID without rebuilding the graph canvas or managed control and selection regions.

#### Scenario: Background loading completes within the soft limit
- **WHEN** the active graph contains 7,432 nodes and 11,377 edges under the current query
- **THEN** the Workbench automatically loads the complete graph and reports complete progress

#### Scenario: A page arrives
- **WHEN** a valid continuation page is merged
- **THEN** existing Sigma canvas, camera, selection, focus, control drawer, and selection drawer identities are preserved

### Requirement: Workbench Graph windows SHALL reject stale work
The Workbench SHALL bind page and slice merges to generation, graph hash, and query signature. Leaving the Graph tab, changing filters, invalidating the graph, changing layout, or cleaning up the runtime SHALL stop subsequent requests and cause in-flight stale results to be discarded.

#### Scenario: Filters change during a read
- **WHEN** an earlier filter generation returns after a new filtered window starts
- **THEN** the old page is discarded and does not modify the visible graph or cursor

### Requirement: Workbench Graph windows SHALL pause and resume at soft limits
The interactive Graph window SHALL pause by default after accumulating 10,000 nodes or 20,000 edges and SHALL let the user continue by increasing the respective allowance by the same amount. A failed page SHALL expose retry without discarding already merged valid pages.

#### Scenario: Soft edge limit is reached
- **WHEN** the merged window reaches 20,000 edges and more pages remain
- **THEN** automatic loading pauses with progress and a continue action

#### Scenario: User continues loading
- **WHEN** the user continues a paused window
- **THEN** the allowance increases by 10,000 nodes and 20,000 edges and serial loading resumes from the existing cursor

### Requirement: Neighborhood expansion SHALL not advance sequential loading
Incoming, outgoing, and bidirectional one-hop patches SHALL use the same ID-based merge path as pages while leaving the main continuation cursor and sequential progress unchanged.

#### Scenario: The same neighborhood is expanded twice
- **WHEN** an identical valid slice patch is merged repeatedly
- **THEN** no duplicate node or edge is created and the next page cursor is unchanged

### Requirement: Topic graph exports SHALL be complete or explicitly fail
Topic HTML and graph export SHALL aggregate every required topic page and layout page under one stable basis. If an export safety limit is reached before completion, the operation SHALL return a typed failure and SHALL NOT emit a silently incomplete graph.

#### Scenario: Export exceeds its safety limit
- **WHEN** more graph data remains after the export safety ceiling is reached
- **THEN** the export fails with a stable typed error and produces no partial result

