## MODIFIED Requirements

### Requirement: Topic artifact deletion

Deleting topic artifacts SHALL remove associated topic relation proposals from active topic graph views.

#### Scenario: Soft delete marks associated relations deleted

- **GIVEN** a materialized topic has topic graph edges or relation review items
- **WHEN** Host deletes the topic artifact
- **THEN** associated topic graph edges are marked `deleted`
- **AND** associated topic graph review items are marked `deleted`
- **AND** active topic graph and review views do not show those proposals

#### Scenario: Purge removes associated relation state

- **GIVEN** a deleted topic artifact has associated topic graph relation state
- **WHEN** Host purges deleted topic artifacts
- **THEN** associated topic graph edges are permanently removed
- **AND** associated topic graph review items are permanently removed
- **AND** the deleted topic graph node is permanently removed
