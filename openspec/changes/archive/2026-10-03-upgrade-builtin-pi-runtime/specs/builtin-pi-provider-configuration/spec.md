# Spec Delta

## ADDED Requirements

### Requirement: Execution versions identify the selected code independently

Frozen selections SHALL identify the admitted runtime and Provider implementation versions from a shared exact dependency basis. Estimator records SHALL identify their own implementation version. Catalog revision SHALL remain independent and historical selections SHALL retain their original versions.

#### Scenario: SDK upgrade creates a new selection
- **WHEN** the admitted matched SDK dependencies change and a new turn selection is created
- **THEN** it records the new execution versions without changing historical snapshots or substituting catalog revision
