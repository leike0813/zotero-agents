## ADDED Requirements

### Requirement: Shadow graph work is bounded and transaction-light
Build, layout, and metrics kernels SHALL run through the bounded worker outside SQLite transactions; direct full build admission SHALL enforce 8 MiB, 250,000 request JSON nodes, and 50,000 result JSON nodes without packed fallback; reads SHALL remain bounded and available during compute.

#### Scenario: Oversized graph is rejected before worker admission
- **WHEN** a direct private rebuild exceeds a monolithic admission bound
- **THEN** it returns `invalid_request` without worker execution or repository mutation
