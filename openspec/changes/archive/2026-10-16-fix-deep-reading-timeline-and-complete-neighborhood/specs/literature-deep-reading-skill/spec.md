## ADDED Requirements

### Requirement: Deep reading SHALL embed the complete bounded paper neighborhood

Deep reading SHALL request a two-hop citation neighborhood and render every retained node with finite Host-provided coordinates, including single-source external references. It SHALL identify the current paper by its portable paper ref. Workbench overview visibility SHALL remain unchanged.

#### Scenario: Single-source references have persisted coordinates

- **WHEN** a two-hop slice includes library, shared external, and single-source external nodes with persisted coordinates
- **THEN** deep-reading WebGL and SVG render those retained nodes without applying overview source-degree admission
- **AND** the current paper remains identifiable after standalone filtering.

#### Scenario: Coordinates are incomplete

- **WHEN** some neighborhood nodes have no finite persisted coordinates
- **THEN** deep reading retains the coordinate intersection and closed edges with partial/stale diagnostics
- **AND** it does not initiate layout computation.
