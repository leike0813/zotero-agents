## ADDED Requirements

### Requirement: Reference refresh and graph rebuild have separate budgets
Reference Sidecar refresh and Citation Graph cache rebuild SHALL be measured as separate explicit operations.

#### Scenario: Reference refresh reports progress
- **WHEN** Reference Sidecar refresh runs
- **THEN** progress SHALL report scanned artifacts or sources, changed references artifacts, extracted raw references, canonicalized references, and binding updates where known.

#### Scenario: Graph cache rebuild reports progress
- **WHEN** Citation Graph cache rebuild runs
- **THEN** progress SHALL report graph input loading, effective canonical resolution, binding target application, node and edge generation, metrics generation, and cache commit.
