## ADDED Requirements

### Requirement: Broker SHALL own canonical mutation admission and evidence
The Broker SHALL reserve accepted mutation operations by caller scope and `operationId`, bind each reservation to a canonical request digest, serialize competing replays, verify final Host state, and retain bounded process-local outcomes. It MUST NOT persist a mutation ledger or expose registry records.

#### Scenario: Same operation is replayed with the same request
- **WHEN** a caller repeats an accepted `operationId` with the same canonical request in the same Host process
- **THEN** the Broker returns or waits for the original outcome without executing a second write

#### Scenario: Same operation identity carries different input
- **WHEN** a caller reuses an accepted `operationId` with a different canonical request digest
- **THEN** the Broker returns a conflict with reason `idempotency_conflict` before another write begins

### Requirement: Broker SHALL distinguish pre-admission errors from accepted attempts
Invalid or unaccepted requests MAY fail through the shared error contract. After operation reservation succeeds, every terminal failure, cancellation, ambiguity, or repair condition SHALL return structured attempt evidence instead of only throwing.

#### Scenario: Commit state cannot be confirmed
- **WHEN** an accepted write may have committed but final state cannot be proven
- **THEN** the result is `unknown`, names reconciliation as recovery, and forbids blind replay

#### Scenario: Compensation leaves known residue
- **WHEN** rollback fails and residual effects are confirmed
- **THEN** the result is `repair_required` with bounded residual evidence
