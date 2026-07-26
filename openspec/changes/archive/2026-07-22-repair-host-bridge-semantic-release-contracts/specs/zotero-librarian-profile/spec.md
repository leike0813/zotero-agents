## ADDED Requirements

### Requirement: Librarian SHALL load command contracts by operation stage
The resident profile SHALL load one relevant command card for each operation stage and SHALL load a new card before crossing into another command family.

#### Scenario: Resident research spans multiple domains
- **WHEN** a lifecycle moves from workflow execution to cache, graph, topic, or product work
- **THEN** the profile SHALL load the command card for each new stage rather than reusing one unrelated card.

### Requirement: Librarian SHALL follow durable recovery contracts
The resident profile SHALL treat operation and agent-apply receipts as the authority for unknown, partial, or interrupted writes.

#### Scenario: Apply is interrupted
- **WHEN** the resident Agent loses an apply response or observes outcome_unknown
- **THEN** it SHALL inspect the retained receipt and SHALL NOT blindly replay the write.
