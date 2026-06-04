## ADDED Requirements

### Requirement: Production Cluster Dedupe SHALL Remain Bounded
Production cluster external dedupe SHALL use bounded blocking and pair budgets.

#### Scenario: Candidate blocks exceed budget
- **WHEN** cluster dedupe block size or pair budget is exceeded
- **THEN** production advanced matching SHALL record diagnostics
- **AND** it SHALL NOT widen to a global all-canonical pair scan.
