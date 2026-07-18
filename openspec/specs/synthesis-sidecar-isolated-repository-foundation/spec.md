## ADDED Requirements

### Requirement: Isolated repository persists Citation Graph application projections
The shared repository and Node adapter SHALL install a separate graph-application schema identity, active state, nodes, edges, ownership, incoming groups, light/complex metrics, and layouts; full replacement SHALL compare-and-swap the active graph in one transaction and metrics/layout SHALL promote only for the active graph hash.

#### Scenario: Last-good graph survives failed replacement
- **WHEN** expected basis, row persistence, or transaction commit fails
- **THEN** the complete previous graph state and its readable projections remain unchanged
