## ADDED Requirements

### Requirement: Worker documentation defines WorkItem governance

Synthesis docs SHALL document WorkItem production and ownership.

#### Scenario: A worker or queue design changes

- **WHEN** a design change creates or modifies Synthesis work
- **THEN** docs SHALL identify the WorkItem type, owner worker, producer,
  consumer, terminal states, retry policy, and UI/debug projection
- **AND** it SHALL not describe dirty events or job rows as independent durable
  work truth.
