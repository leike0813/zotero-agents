## ADDED Requirements

### Requirement: MCP cache diagnostics do not start work
Synthesis MCP tools SHALL report Reference Sidecar and Citation Graph cache readiness without starting refresh or graph rebuild.

#### Scenario: Graph cache is stale
- **WHEN** an MCP graph read detects stale graph cache basis
- **THEN** it SHALL return diagnostics recommending `rebuildCitationGraphCacheNow`
- **AND** it SHALL NOT run Reference Sidecar refresh, graph cache rebuild, or layout rebuild.

#### Scenario: Reference sidecar is stale
- **WHEN** an MCP registry/cache read detects stale sidecar cache basis
- **THEN** it SHALL recommend `refreshReferenceSidecarNow`
- **AND** it SHALL NOT read legacy projection state to infer readiness.
