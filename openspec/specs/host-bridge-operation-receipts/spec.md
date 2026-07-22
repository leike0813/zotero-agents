# host-bridge-operation-receipts Specification

## Purpose
TBD - created by syncing change repair-host-bridge-semantic-release-contracts. Update Purpose after archive.

## Requirements

### Requirement: State-changing requests SHALL be idempotent by operation id
Host Bridge SHALL accept an opaque operation id for every state-changing request and SHALL persist the canonical request digest and execution receipt for 30 days.

#### Scenario: Same operation is replayed
- **WHEN** the same operation id and request digest are submitted again
- **THEN** Host Bridge SHALL return the persisted response or current receipt
- **AND** SHALL NOT repeat the state change.

#### Scenario: Operation id is reused for different input
- **WHEN** an existing operation id is submitted with a different canonical request digest
- **THEN** Host Bridge SHALL reject it with `idempotency_conflict`.

### Requirement: Unknown outcomes SHALL be inspectable
CLI v3 SHALL distinguish unchanged, changed, and unknown state and handle outcomes.

#### Scenario: Response is lost after request transmission
- **WHEN** the CLI has transmitted a state-changing request but cannot read a response
- **THEN** it SHALL report an unknown outcome and the operation id
- **AND** SHALL direct the caller to the operation receipt instead of blind retry.

#### Scenario: Caller reads an operation receipt
- **WHEN** an authenticated caller requests an existing operation id
- **THEN** Host Bridge SHALL return its state, request identity, timestamps, and retained result without repeating execution.
