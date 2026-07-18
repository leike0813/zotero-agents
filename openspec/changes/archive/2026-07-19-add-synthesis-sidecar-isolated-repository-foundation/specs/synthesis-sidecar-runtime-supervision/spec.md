## ADDED Requirements

### Requirement: Supervisor readiness depends on repository readiness
The supervised service SHALL initialize and reconcile its isolated repository before discovery publication, and every shutdown trigger SHALL close the repository within the shared bounded shutdown sequence.

#### Scenario: Startup failure leaves no discoverable service
- **WHEN** repository identity or schema initialization fails
- **THEN** the process exits without publishing a ready discovery record

#### Scenario: Supervisor stop leaves no repository lock
- **WHEN** the supervisor terminates the service through its normal or forced stop path
- **THEN** no child worker or SQLite handle remains owned by the stopped service process
