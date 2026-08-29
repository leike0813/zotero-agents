## MODIFIED Requirements

### Requirement: Topic graph projection is rebuildable

Synthesis Topic Graph SHALL use the configured Topic Graph index engine to
compute deterministic roots and unplaced identifiers for the rebuildable
`topic-graph-index` projection while the application owns repository reads,
complete node/edge/review rows, manifest basis, diagnostics, progress, and
projection registry promotion.

#### Scenario: Projection rebuild records registry state

- **WHEN** the topic graph projection is rebuilt from canonical state
- **THEN** the application SHALL build and strictly validate the index against
  the current manifest basis through the configured engine
- **AND** Foundation projection registry SHALL record schema version, source
  manifest hash, stale flag, last rebuild time, and diagnostics only after a
  valid result.

#### Scenario: Projection cache is missing

- **WHEN** local projection cache is deleted
- **THEN** the service SHALL rebuild graph DTO state from canonical state
  through the configured engine.

#### Scenario: Engine computation fails

- **WHEN** the engine throws, is cancelled, exceeds bounds, or returns a
  malformed result
- **THEN** the last durable Topic Graph state and projection registry state
  SHALL remain unchanged.
