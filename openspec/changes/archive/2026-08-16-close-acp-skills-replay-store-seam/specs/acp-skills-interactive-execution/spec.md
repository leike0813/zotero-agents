## ADDED Requirements

### Requirement: ACP Skill run records SHALL support generic hard deletion

The ACP skill-run store SHALL expose a generic hard-delete operation that
flushes pending runtime writes, removes persisted and in-memory run records,
clears selection for deleted request ids, and emits the archive workspace
change. Replay cleanup SHALL use this operation instead of replay-specific
store helpers.

#### Scenario: Hard deletion removes every owned record atomically

- **WHEN** one or more ACP skill-run request ids are hard-deleted
- **THEN** persisted run rows and in-memory records SHALL be removed
- **AND** selection SHALL be cleared when it references a deleted request
- **AND** one archive workspace change SHALL be emitted for the deleted ids

#### Scenario: Hard deletion does not change archive or retention semantics

- **WHEN** archive or retention cleanup runs
- **THEN** their existing lifecycle behavior SHALL remain unchanged
- **AND** the hard-delete operation SHALL NOT become the default user-facing
  removal path
