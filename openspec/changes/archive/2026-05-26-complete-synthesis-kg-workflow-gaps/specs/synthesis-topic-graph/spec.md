## ADDED Requirements

### Requirement: Low-confidence relation proposals are reviewable

Synthesis Topic Graph SHALL keep low-confidence or explicit-review relation proposals as canonical review items before creating suggested edges.

#### Scenario: Low-confidence proposal enters review queue

- **WHEN** relation proposal ingestion receives a low-confidence proposal
- **THEN** it SHALL create an open topic graph review item
- **AND** it SHALL NOT create a suggested edge for that proposal.

#### Scenario: Review item is approved

- **WHEN** a user approves a topic graph review item
- **THEN** the service SHALL create the corresponding suggested edge
- **AND** mark the review item approved
- **AND** mark `topic-graph-index` stale.

#### Scenario: Review item is rejected

- **WHEN** a user rejects a topic graph review item
- **THEN** the review item SHALL be marked rejected
- **AND** no edge SHALL be created.
