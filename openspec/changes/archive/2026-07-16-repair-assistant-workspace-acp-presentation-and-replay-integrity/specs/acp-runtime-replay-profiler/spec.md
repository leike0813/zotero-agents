## MODIFIED Requirements

### Requirement: Replay separates completion from acceptance

Replay completion SHALL describe execution and measurement availability only.
Acceptance SHALL separately evaluate publication lifecycle, bytes, forbidden
materialization, steady snapshots, target visibility, and drift.

#### Scenario: Execution finishes over the byte budget

- **WHEN** execution and measurement complete but posted bytes exceed budget
- **THEN** completion remains complete
- **AND** acceptance fails with the byte-budget reason.

### Requirement: Replay uses current v5 lifecycle vocabulary

Replay SHALL use exact v5 source, kind, form, cause, delivery, rebase, and
overflow semantics. Historical matrix compatibility and governance eligibility
fields SHALL NOT remain in current-state results.

#### Scenario: A target-active run drains

- **WHEN** Replay reaches its source/publication/delivery barrier
- **THEN** every earlier matching publication has a terminal ledger result
- **AND** unknown gaps make measurement incomplete rather than silently passing.
