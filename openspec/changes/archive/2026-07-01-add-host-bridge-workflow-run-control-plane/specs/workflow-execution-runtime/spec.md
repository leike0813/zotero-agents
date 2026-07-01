## ADDED Requirements

### Requirement: Sequence step skill runs remain externally traceable

Workflow runtime projections SHALL preserve enough sequence metadata for Host Bridge to expose each concrete sequence step as a skill run.

#### Scenario: Sequence step projection includes identifiers
- **WHEN** a sequence workflow launches a concrete step
- **THEN** task and run projections SHALL retain the parent workflow run id, sequence step id, sequence step index, job id, backend id, request id when known, and opaque skill run handle source.

#### Scenario: Host Bridge can classify sequence roles
- **WHEN** Host Bridge builds a workflow run status from sequence projections
- **THEN** it SHALL classify sequence skill runs as step-level projections rather than treating the parent workflow run id as the executable skill run handle.
