# synthesis-citation-graph-layout-engine Specification

## Purpose
Defines the Synthesis citation graph layout engine, specifying its processing pipeline, input/output contracts, and integration with the parent capability.

## Requirements

### Requirement: Layout compute SHALL use a strict environment-neutral contract


The Citation Graph layout engine SHALL accept and return canonical JSON-safe DTOs that contain only the bounded graph slice and deterministic layout facts required for computation, including optional node title/year tie-break inputs and finite application-derived initial coordinates.

#### Scenario: Canonical request is rebuilt

- **WHEN** an application supplies a graph hash, supported algorithm, nodes, and edges with unknown JSON-safe fields
- **THEN** the engine contract SHALL rebuild sorted canonical node and edge rows
- **AND** it SHALL discard the unknown fields.

#### Scenario: Production rows contain optional blank text

- **WHEN** the native Citation Graph compute adapter serializes a node whose title or year is empty after trimming
- **THEN** that optional field SHALL be omitted from the worker DTO
- **AND** non-empty title and year values SHALL be trimmed and bounded before dispatch
- **AND** layout and metrics SHALL use the same optional-text serialization rule.

#### Scenario: Invalid input is rejected before computation

- **WHEN** a request is non-JSON, exceeds 20,000 nodes or 80,000 edges, duplicates an identifier, references a missing endpoint, or uses an invalid hash or algorithm
- **THEN** canonical rebuilding SHALL reject the request before a layout kernel runs.

#### Scenario: Result node set is invalid

- **WHEN** an engine result contains non-finite coordinates or omits, duplicates, or adds a node relative to the request
- **THEN** result rebuilding SHALL reject the result as malformed.

### Requirement: Layout kernels SHALL preserve versioned deterministic behavior

The layout engine contract SHALL identify force, radial, and components requests while production computation is owned by the Rust layout v2 crate. The TypeScript package SHALL retain strict request/result DTO rebuilding and projection helpers but SHALL NOT retain a production layout kernel.

#### Scenario: Canonical request is rebuilt

- **WHEN** an application supplies a graph hash, supported algorithm, nodes, and edges with unknown JSON-safe fields
- **THEN** the contract SHALL rebuild sorted canonical node and edge rows
- **AND** it SHALL discard unknown fields before dispatch.

#### Scenario: Rust result is rebuilt

- **WHEN** a layout v2 result returns from the native worker
- **THEN** the TypeScript boundary SHALL validate engine/version identity, parameters, exact node membership, and finite coordinates
- **AND** it SHALL NOT rerun a TypeScript algorithm to establish trust.

#### Scenario: Runtime dependency boundary is inspected

- **WHEN** production layout dependencies are traversed
- **THEN** no d3-force, Node worker, DOM, Zotero, repository, or filesystem layout implementation SHALL be reachable from the engine contract.

### Requirement: Layout v2 SHALL execute three Rust-owned algorithms

The native layout engine SHALL implement `force`, `radial`, and `components` as version 2 algorithms and SHALL return one finite coordinate for every accepted node.

#### Scenario: Force layout is computed

- **WHEN** a canonical force request is dispatched
- **THEN** the engine SHALL execute the fixed ForceAtlas2 v2 configuration from finite application-derived initial coordinates
- **AND** it SHALL return engine identity `forceatlas2-rust` and layout version `2`.

#### Scenario: Structured layout is computed

- **WHEN** a canonical radial or components request is dispatched
- **THEN** the engine SHALL preserve the existing stable ordering, spacing, golden-angle, and 0.001-rounding semantics
- **AND** it SHALL identify the corresponding Rust v2 engine.

### Requirement: Layout v2 SHALL be deterministic and bounded

The engine SHALL canonicalize input order, use fixed parameters, round output to 0.001, honor cancellation, and remain within the production graph, time, and memory limits.

#### Scenario: A request is repeated on one target

- **WHEN** the same canonical request is computed three times by the same target binary
- **THEN** all rounded coordinates and the projected layout hash SHALL be identical.

#### Scenario: The maximum accepted graph is computed

- **WHEN** a valid graph contains up to 20,000 nodes and 80,000 edges
- **THEN** computation SHALL either return a complete result or terminate as `worker_timeout` at the ten-second hard deadline
- **AND** a timeout SHALL NOT produce a promotable partial layout
- **AND** peak worker RSS SHALL remain below 256 MiB.

#### Scenario: Active computation is canceled

- **WHEN** cancellation is requested during iterative force computation
- **THEN** the engine SHALL acknowledge cancellation within 500 ms
- **AND** no result SHALL be eligible for promotion.

### Requirement: Application layout projection SHALL be deterministic and bounded

The application SHALL derive one default layout projection before worker dispatch. It SHALL select active library nodes before shared external nodes, order each tier by stable node ID, exclude single-source hover-only external nodes, and cap the result at 20,000 nodes. It SHALL retain only edges whose endpoints are both selected, order them by stable edge ID, and cap them at 80,000 edges.

#### Scenario: Default graph exceeds the layout bounds

- **WHEN** the active default graph contains more rows than the layout contract accepts
- **THEN** repeated projection of the same graph SHALL select the same nodes and edges
- **AND** every selected edge endpoint SHALL be present in the selected node set
- **AND** the persisted graph cache and its full graph hash SHALL remain unchanged.

#### Scenario: Read surface displays the default graph

- **WHEN** Workbench pages through default-visible Citation Graph rows
- **THEN** those rows SHALL use the same bounded default projection as layout computation
- **AND** hover-only rows SHALL remain outside the layout node set.

### Requirement: Layout v2 SHALL satisfy graph quality invariants

Every successful result SHALL preserve the exact input node set, contain only finite coordinates, produce a non-collapsed extent for a non-trivial graph, and remain within reviewed overlap and edge-length thresholds.

#### Scenario: A connected fixture is laid out

- **WHEN** a reviewed connected graph fixture is computed
- **THEN** the result SHALL satisfy its overlap, edge-length, and extent thresholds without asserting exact architecture-independent coordinates.

#### Scenario: Isolated nodes are present

- **WHEN** accepted input contains isolated nodes
- **THEN** each isolated node SHALL receive a stable finite position using the versioned isolated-node spacing policy.

### Requirement: Layout v2 cache migration SHALL be rebuild-only

Version 1.2 layout rows SHALL remain readable as stale cache data, while only version 2 results SHALL be current and promotable.

#### Scenario: A legacy layout exists

- **WHEN** a graph has a persisted version 1.2 layout
- **THEN** the plugin MAY display it optimistically
- **AND** it SHALL schedule or accept an explicit v2 rebuild without rewriting canonical graph data.

#### Scenario: A v2 result is promoted

- **WHEN** a valid v2 result returns and the graph basis is unchanged
- **THEN** the plugin SHALL atomically replace the stale layout with the version 2 result.
