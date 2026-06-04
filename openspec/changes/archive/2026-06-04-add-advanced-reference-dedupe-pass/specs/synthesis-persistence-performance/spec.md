## MODIFIED Requirements

### Requirement: Advanced matching is budgeted separately from refresh
Advanced reference matching SHALL have a separate performance budget from Reference Sidecar refresh.

#### Scenario: Fuzzy dedupe runs
- **WHEN** fuzzy canonical dedupe runs
- **THEN** it SHALL use bounded blocking keys and operation-level pair budgets
- **AND** it SHALL NOT perform a global all-canonical N² title-similarity scan.

#### Scenario: Fuzzy budget is exceeded
- **WHEN** a fuzzy block or operation exceeds its budget
- **THEN** Synthesis SHALL record diagnostics and skip excess comparisons instead of widening the scan.
