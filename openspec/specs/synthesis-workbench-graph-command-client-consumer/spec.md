# synthesis-workbench-graph-command-client-consumer Specification

## Purpose
Defines the Synthesis Workbench client consumer contract for graph command operations, specifying how Workbench reads and reacts to client-side state changes.

## Requirements

### Requirement: Citation Graph commands use a bounded client capability

The Synthesis client SHALL expose a `graph` capability with commands for Citation Graph layout recomputation, full cache rebuild, incremental cache refresh, and failed rebuild retry. The Workbench SHALL resolve the default client lazily and SHALL NOT call the corresponding legacy service methods directly.

#### Scenario: Workbench invokes a cache command
- **WHEN** the user confirms a full rebuild, requests an incremental refresh, or retries a failed rebuild
- **THEN** the Workbench SHALL invoke the corresponding no-argument `client.graph` method
- **AND** the command result SHALL cross the client boundary as an opaque JSON-safe object

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

The in-process adapter SHALL depend on four narrow legacy Graph command ports, normalize every successful result through the shared JSON-safe object path, reject a missing port with `unavailable`, preserve an existing client error, and normalize an ordinary legacy exception to `internal`.

#### Scenario: Legacy command succeeds with a non-JSON-safe value
- **WHEN** a configured Graph command port returns a result containing values handled by the shared JSON normalization rules
- **THEN** the client SHALL return the normalized opaque JSON-safe object

#### Scenario: Legacy command port is absent
- **WHEN** a caller invokes a Graph command whose legacy port was not composed
- **THEN** the adapter SHALL reject with `unavailable`

#### Scenario: Legacy command throws an ordinary exception
- **WHEN** a configured Graph command port throws a non-client exception
- **THEN** the adapter SHALL reject with `internal`

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
