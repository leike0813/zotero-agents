## ADDED Requirements

### Requirement: Runtime bundle SHALL include graph-build compute code
The compiled runtime, manifest, XPI requirements, and source fingerprint SHALL
cover the graph-build engine module and three-operation worker without adding a
third-party dependency.

#### Scenario: Runtime bundle is assembled
- **WHEN** a source runtime bundle is built
- **THEN** it SHALL contain the compiled graph-build module, protocol, pool, worker, and existing dependency licenses

#### Scenario: Runtime source changes
- **WHEN** graph-build engine or worker source changes without regenerated prebuilds
- **THEN** freshness governance SHALL fail closed until the separate release workflow produces matching assets
