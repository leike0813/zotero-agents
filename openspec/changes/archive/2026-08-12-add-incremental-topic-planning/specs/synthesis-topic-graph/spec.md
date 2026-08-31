## ADDED Requirements

### Requirement: Placeholder nodes represent Planned Topics
The Topic Graph SHALL represent Planned Topics with existing placeholder nodes and SHALL expose a public lifecycle of `planned`, `stale`, or `materialized` without creating a parallel topic identity.

#### Scenario: Planned Topic is materialized
- **WHEN** topic synthesis succeeds for a Planned Topic
- **THEN** the same topic identifier is promoted to a materialized node and its planning definition remains available as provenance

### Requirement: Relation proposal decisions are durable
Relation proposals SHALL be reconciled by a canonical directed tuple of source topic, relation type, and target topic. Accepted and rejected decisions SHALL survive later planner and topic-synthesis proposals for the same tuple.

#### Scenario: A second producer proposes the same relation
- **WHEN** a planner or synthesis run proposes a tuple that already has a reviewed decision
- **THEN** the decision is preserved and the new producer is added to provenance without reopening review

#### Scenario: Content synthesis adds evidence
- **WHEN** topic synthesis proposes an unreviewed relation that the planner already proposed
- **THEN** the canonical proposal may merge supporting evidence and provenance without creating a duplicate edge candidate

