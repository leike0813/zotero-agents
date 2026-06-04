## MODIFIED Requirements

### Requirement: Invariants guard split sidecar operations

Invariant guards SHALL distinguish visible graph incremental refresh from hidden full graph rebuild.

#### Scenario: Sidecar refresh does not directly replace graph cache

- **WHEN** static guards inspect the Reference Sidecar refresh path
- **THEN** they SHALL reject direct `replaceCitationGraphState` calls from that path
- **AND** they SHALL allow a separate graph refresh operation.

#### Scenario: Workflow apply cannot bootstrap missing graph

- **WHEN** static guards inspect workflow apply sidecar code
- **THEN** they SHALL reject direct full graph rebuild calls from that path.
