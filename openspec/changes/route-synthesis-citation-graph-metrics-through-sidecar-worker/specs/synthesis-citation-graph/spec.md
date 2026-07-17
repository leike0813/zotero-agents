## ADDED Requirements

### Requirement: Metrics kernel may execute across the sidecar boundary
Citation Graph refresh SHALL allow the pure metrics kernel to execute remotely
while graph capture, basis comparison, and promotion remain in the plugin.

#### Scenario: Remote result matches current graph
- **WHEN** a strictly rebuilt metrics result returns and the graph basis is unchanged
- **THEN** the existing promotion path stores that result exactly as it would store a direct-engine result

#### Scenario: Remote result is late
- **WHEN** a metrics result returns after its graph basis has been superseded
- **THEN** the existing promotion guards discard it
