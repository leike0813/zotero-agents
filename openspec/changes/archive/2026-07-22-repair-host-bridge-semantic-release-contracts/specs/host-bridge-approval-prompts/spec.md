## ADDED Requirements

### Requirement: ACP write auto-approval SHALL require a Host-issued runtime grant
Host Bridge SHALL authorize `autoApproveWrites` only when a random unexpired grant matches an active run, runtime credential, trusted locality, request identity, and current run policy.

#### Scenario: Caller replays a previous scope
- **WHEN** a caller supplies a known request id and `autoApproveWrites` without a valid current grant
- **THEN** Host Bridge SHALL follow the normal approval path.

#### Scenario: Run reaches terminal state
- **WHEN** the owning run terminates, is rematerialized, fails injection, or the plugin restarts
- **THEN** the previous grant SHALL no longer authorize writes.

#### Scenario: Grant metadata is reported
- **WHEN** diagnostics, summaries, receipts, or run metadata are emitted
- **THEN** they SHALL NOT expose the grant id.
