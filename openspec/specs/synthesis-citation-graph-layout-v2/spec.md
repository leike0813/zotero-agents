# synthesis-citation-graph-layout-v2 Specification

## Purpose
Defines the Synthesis Citation Graph Layout v2 capability, specifying the Rust-owned layout v2 algorithms, determinism and quality invariants, and cache migration from legacy v1.2 layouts.

## Requirements

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

### Requirement: Layout quality verification SHALL distinguish native output from stale UI coordinates

Citation Graph layout verification SHALL include a reviewed non-trivial fixture that checks finite coordinates, non-collapsed extent, and approved spacing/edge-length thresholds without asserting exact architecture-dependent coordinates.

#### Scenario: The native layout fixture passes

- **WHEN** the v2 layout engine computes the reviewed fixture
- **THEN** the result satisfies the existing quality invariants
- **AND** a Workbench failure to show spacing is diagnosed as coordinate application or refresh behavior.

#### Scenario: The native layout fixture fails

- **WHEN** the v2 engine itself produces a collapsed or invalid layout
- **THEN** the layout implementation is corrected at its existing normalization/spacing boundary
- **AND** no UI workaround hides the native quality failure.
