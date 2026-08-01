# synthesis-workbench-graph-command-client-consumer Specification

## Purpose
Defines the Synthesis Workbench client consumer contract for graph command operations, specifying how Workbench reads and reacts to client-side state changes.

## Requirements

### Requirement: Workbench graph reads SHALL receive a renderable native projection

`getSynthesisWorkbenchSurfaceInput` for `graph` SHALL return an explicit graph
object containing the active graph hash, public UI nodes and edges, hover-only
rows, layout status, diagnostics, and topic scopes. Missing fields SHALL NOT be
used to represent a rebuilt graph.

#### Scenario: Rebuild succeeds before layout exists
- **WHEN** Workbench refreshes the graph surface after a successful rebuild
- **THEN** nodes and edges render immediately with layout status `missing` or `stale`
- **AND** the existing bounded auto-layout path may request one recomputation

#### Scenario: Layout recomputation succeeds
- **WHEN** Workbench refreshes the same graph and the normalized layout is ready
- **THEN** every displayed node receives finite coordinates
- **AND** the ready layout does not trigger another automatic recomputation

### Requirement: Citation Graph commands use a bounded client capability

The Synthesis client SHALL expose a `graph` capability with commands for
scoped update, metrics refresh, layout recomputation, full cache rebuild,
incremental cache refresh, and failed rebuild retry. The Workbench SHALL
resolve the default client lazily and SHALL NOT construct native worker
requests.

#### Scenario: Workbench invokes a cache command
- **WHEN** the user confirms a full rebuild, requests an incremental refresh, or retries a failed rebuild
- **THEN** the Workbench SHALL invoke the corresponding no-argument `client.graph` method
- **AND** the command result SHALL cross the client boundary as an opaque JSON-safe object

#### Scenario: Native client serializes cache commands
- **WHEN** full rebuild, incremental refresh, or retry crosses the native transport
- **THEN** the request envelope SHALL contain exactly `{args: []}`
- **AND** no rebuild scope, graph basis, Host data, or worker payload SHALL be serialized by TypeScript

#### Scenario: Native client serializes update and metrics commands
- **WHEN** a caller omits the optional update or metrics request
- **THEN** the native client SHALL send one empty public request object
- **AND** an explicit supported public request SHALL be forwarded without internal fields

#### Scenario: Workbench recomputes layout
- **WHEN** the Workbench manually or automatically recomputes Citation Graph layout
- **THEN** it SHALL invoke `client.graph.recomputeCitationGraphLayout`
- **AND** it SHALL NOT invoke the legacy layout method directly

### Requirement: Layout requests have a narrow validated contract

The layout request SHALL contain an algorithm from `force`, `radial`, or `components` and MAY contain a boolean `force` flag. The in-process adapter SHALL reject invalid request shapes, algorithms, and force values with the stable `invalid_request` client error code.

#### Scenario: Manual layout is requested
- **WHEN** a user explicitly requests layout recomputation with a supported algorithm
- **THEN** the Workbench SHALL send that algorithm with `force: true`

#### Scenario: Automatic layout refresh is needed
- **WHEN** the active Graph surface passes the existing layout-ready and hash guards and requires recomputation
- **THEN** the Workbench SHALL send the selected supported algorithm without forcing the operation

#### Scenario: Runtime request is malformed
- **WHEN** the adapter receives an unknown algorithm, a non-boolean force value, a non-JSON callback value, or a non-object request
- **THEN** it SHALL reject with `invalid_request`
- **AND** it SHALL NOT invoke the legacy layout port

### Requirement: In-process Graph commands normalize ports, results, and errors

The in-process adapter SHALL depend on narrow Graph command ports, normalize every successful result through the shared JSON-safe object path, reject a missing port with `unavailable`, preserve an existing client error, and normalize an ordinary command exception to `internal`.

#### Scenario: Command succeeds with a non-JSON-safe value
- **WHEN** a configured Graph command port returns a result containing values handled by the shared JSON normalization rules
- **THEN** the client SHALL return the normalized opaque JSON-safe object

#### Scenario: Command port is absent
- **WHEN** a caller invokes a Graph command whose legacy port was not composed
- **THEN** the adapter SHALL reject with `unavailable`

#### Scenario: Command throws an ordinary exception
- **WHEN** a configured Graph command port throws a non-client exception
- **THEN** the adapter SHALL reject with `internal`

### Requirement: Workbench SHALL classify resolved Graph mutation results

The Workbench SHALL treat a resolved Graph command promise as successful only
after classifying its terminal result. Native `promoted` and `unchanged` results
SHALL complete the operation. Native `basis_mismatch`,
`graph_application_busy`, `worker_busy`, `worker_failed`, `invalid_request`,
`repair_required`, and `stopping` results SHALL become typed
`SynthesisClientError` failures. A retained implementation result with
`ok: true` and `completed`, `bootstrapped`, `skipped`, or `superseded` status
SHALL remain successful; a status-less retained result SHALL fail when its
finite `failed` count is greater than zero, and `ok: false` SHALL fail.

#### Scenario: Native worker returns a non-success terminal result
- **WHEN** any of the four Workbench Graph commands resolves with `worker_busy`, `worker_failed`, `basis_mismatch`, or another native non-success status
- **THEN** the Workbench operation reports failure instead of completion
- **AND** normal single-flight cleanup and Graph surface invalidation still run

#### Scenario: Retained layout implementation reports failed work
- **WHEN** a status-less retained result resolves with `failed > 0`
- **THEN** the Workbench operation reports an `internal` client failure

#### Scenario: Retained incremental implementation completes with retained status
- **WHEN** a retained result has `ok: true` and its retained terminal status
- **THEN** the Workbench preserves the successful result

### Requirement: Workbench layout failures SHALL be scoped to the request basis

The Workbench SHALL bind a failed layout attempt to the graph hash and layout
algorithm captured before the request. The record SHALL retain a stable error
code, native mutation status when present, a bounded sanitized message, and the
occurrence time. For that same basis, a non-ready service layout status SHALL
project as `failed`. A different graph hash or algorithm SHALL use its own
service layout status. A service `ready` layout SHALL keep last-good coordinates
visible while the matching latest-attempt failure remains available as a
non-blocking warning. A successful layout request SHALL clear the recorded
failure.

#### Scenario: Layout fails before any coordinates are available
- **WHEN** layout computation fails for the selected graph hash and algorithm and the service has no ready layout
- **THEN** the Graph surface shows an explicit layout failure and the existing redraw action
- **AND** it does not continue to describe the layout as computing
- **AND** it does not automatically retry the failed basis
- **AND** the sanitized failure reason remains visible independently of the transient command status.

#### Scenario: Forced recomputation fails after a ready layout
- **WHEN** a forced layout request fails while the same basis still has a ready persisted layout
- **THEN** the operation reports failure
- **AND** the ready layout and its finite coordinates remain visible
- **AND** the Graph surface warns that the latest redraw failed while it displays the previous layout.

#### Scenario: Surface refresh fails after layout failure
- **WHEN** Workbench records a layout failure and the following service-backed Graph refresh also fails
- **THEN** Workbench SHALL first publish a local Graph snapshot containing the failure projection
- **AND** the surface error path SHALL retain that snapshot instead of restoring a snapshot without the failure.

#### Scenario: Layout failure detail is rendered
- **WHEN** the matching failure projection is visible
- **THEN** ordinary mode SHALL show its sanitized reason and the redraw action
- **AND** debug mode SHALL additionally expose code, mutation status, algorithm, and graph hash.

#### Scenario: Graph layout basis changes after failure
- **WHEN** the graph hash or selected layout algorithm changes after a failed attempt
- **THEN** the prior failure does not project onto the new basis
- **AND** the new basis may use the existing bounded automatic layout path

#### Scenario: Native default graph is larger than the layout projection
- **WHEN** the native surface deterministically bounds default-visible rows to the 20,000-node and 80,000-edge layout projection
- **THEN** Workbench evaluates ready coordinates only for rows returned by that bounded default projection
- **AND** excluded or hover-only graph rows do not make an otherwise complete layout appear missing.

### Requirement: Graph command progress does not cross the client contract

Graph command contracts SHALL NOT accept or return UI progress callbacks, streaming hooks, or Workbench-owned DTOs. Workbench command progress SHALL continue to come from the existing 500 ms `workbench.readProgress()` polling path.

#### Scenario: Cache command starts
- **WHEN** the Workbench starts a full rebuild, incremental refresh, or retry command
- **THEN** it SHALL invoke the Graph client method without an `onProgress` callback
- **AND** it SHALL retain `deferStart: true` and the existing progress polling behavior

#### Scenario: Other Workbench command domains report callback progress
- **WHEN** Reference, Tag, Concept, or Topic Graph commands use the shared progress helper
- **THEN** that helper SHALL remain available outside the Graph client contracts

### Requirement: Existing Citation Graph Workbench behavior is preserved

The client-routed commands SHALL preserve confirmation, command single-flight, readiness and content-hash guards, error presentation, Graph surface invalidation, and stale, missing, and failed cache action semantics.

#### Scenario: A Graph command completes successfully
- **WHEN** a migrated layout or cache command succeeds
- **THEN** the Workbench SHALL invalidate the same Graph surfaces as before
- **AND** subsequent refresh behavior SHALL remain unchanged

#### Scenario: A Graph command fails
- **WHEN** a migrated command rejects through the client boundary
- **THEN** the Workbench SHALL retain its existing command error presentation and single-flight cleanup

### Requirement: Migration boundaries remain stable

This migration SHALL retain 125 public Synthesis service methods, exactly four direct legacy service consumers, all existing public Graph service methods, and current process, repository, persistence, Host Bridge, and MCP ownership.

#### Scenario: Static service boundaries are checked
- **WHEN** the service inventory and direct-consumer checks run
- **THEN** the public method count SHALL remain 125
- **AND** the direct legacy consumers SHALL remain exactly legacy composition, Workbench, Host Bridge, and MCP

#### Scenario: Out-of-scope Graph surfaces are inspected
- **WHEN** the migration is reviewed
- **THEN** Graph queries and metrics refresh SHALL remain on their current paths
- **AND** Graph algorithms, repositories, operation persistence, and public service methods SHALL remain unchanged

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
