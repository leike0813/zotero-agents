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

### Requirement: Resident operations SHALL return stable receipts
Every non-silent Hermes resident-service operation SHALL return `zotero-librarian.operation-receipt.v1` with required `schema`, `operation`, `status`, and `generatedAt`. Status SHALL be `unchanged`, `changed`, `attention`, or `failed`; a failed receipt SHALL include a structured error and use a nonzero exit code.

#### Scenario: Unchanged cron operation is suppressible
- **WHEN** a cron invocation completes with status `unchanged` and quiet mode is enabled
- **THEN** the outer adapter emits `[SILENT]` while the internal operation still produces a valid receipt

#### Scenario: Resident failure is machine-readable
- **WHEN** a resident operation fails
- **THEN** stdout contains the receipt error shape and the process exits nonzero without free-form traceback output

### Requirement: Runner business results and resident receipts SHALL remain distinct
Generic Skill runner results SHALL use the task-result schema, while hosted service invocations SHALL use the operation-receipt schema. Neither contract SHALL masquerade as the other.

#### Scenario: Validator selects contract by boundary
- **WHEN** Host Bridge content validation checks Generic runners and Hermes service commands
- **THEN** each output is validated against its own boundary-specific schema
