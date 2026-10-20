## ADDED Requirements

### Requirement: Complete multi-paper exports SHALL be behaviorally verified

Native artifact evidence SHALL exercise nonempty multi-paper data, complete manifest/content correspondence, filtered kinds, pagination, delayed Host reads, local and remote delivery, and typed failures through real production participants. Declared case labels, empty results, or schema agreement alone SHALL NOT establish export readiness.

#### Scenario: A 24-paper Planned Topic prepares
- **WHEN** the resolver selects 24 papers with all four artifact kinds
- **THEN** the production export produces a complete consumable manifest and contents
- **AND** the preparation runtime produces its handoff with every selected paper accounted for

#### Scenario: Delivery fails before completion
- **WHEN** content retrieval or delivery fails, times out, or shuts down before successful completion
- **THEN** no successful manifest receipt or prepare handoff is produced
- **AND** owned transfer resources are released through the bounded lifecycle
