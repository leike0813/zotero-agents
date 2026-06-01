## ADDED Requirements

### Requirement: Invariants guard split sidecar operations
Synthesis invariant guards SHALL prevent active Reference Sidecar code from reconnecting legacy projection or state-file readiness paths.

#### Scenario: Static guard scans active sources
- **WHEN** invariant tests inspect active Sidecar refresh and Graph cache rebuild sources
- **THEN** they SHALL fail if those paths call legacy full-index replacement, sidecar projection refresh, old registry fact listing APIs, or read legacy sidecar state files as readiness sources.

#### Scenario: Graph and layout operations are checked
- **WHEN** invariant tests inspect Workbench command wiring
- **THEN** they SHALL verify graph data rebuild uses `rebuildCitationGraphCacheNow`
- **AND** layout rebuild remains limited to layout computation.
