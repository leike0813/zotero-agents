## ADDED Requirements

### Requirement: Advanced matching is budgeted separately from refresh
Advanced reference matching SHALL have a separate performance budget from Reference Sidecar refresh.

#### Scenario: Refresh runs
- **WHEN** Reference Sidecar refresh runs
- **THEN** it SHALL NOT pay the cost of fuzzy reference matching.

#### Scenario: Advanced matching runs
- **WHEN** Advanced Reference Matching runs
- **THEN** it SHALL use bounded operation progress and yield points
- **AND** it SHALL not block graph cache rebuild or normal Workbench reads.

