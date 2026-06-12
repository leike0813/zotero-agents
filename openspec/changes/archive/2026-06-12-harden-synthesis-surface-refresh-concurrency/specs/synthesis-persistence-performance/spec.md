## ADDED Requirements

### Requirement: SQLite busy read failures SHALL be classified as transient for UI refresh

Synthesis Workbench refresh paths SHALL classify SQLite busy-style read failures
as transient UI refresh errors.

#### Scenario: Wrapped repository error has busy cause

- **WHEN** a repository or plugin state store error wraps `NS_ERROR_STORAGE_BUSY`,
  `SQLITE_BUSY`, `database is locked`, or an equivalent storage-busy marker
- **THEN** Workbench surface refresh handling SHALL classify the error as
  transient
- **AND** it SHALL NOT treat the error as a successful empty read.

#### Scenario: Busy handling policy remains unchanged

- **WHEN** this classification is added
- **THEN** it SHALL NOT change WAL mode, SQLite busy timeout, retry attempts, or
  write lock strategy.
