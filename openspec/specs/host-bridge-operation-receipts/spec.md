# host-bridge-operation-receipts Specification

## Purpose
TBD - created by syncing change repair-host-bridge-semantic-release-contracts. Update Purpose after archive.

## Requirements

### Requirement: State-changing requests SHALL be idempotent by operation id

Host Bridge SHALL retain generic HTTP operation history only for routes that explicitly use it. Canonical Zotero mutation identity, admission, receipt, attempt, and observation SHALL be owned by the Broker under a stable caller namespace shared by Bridge, inbound MCP, and CLI. HTTP request IDs, connections, and scope headers SHALL not participate in canonical mutation identity.

#### Scenario: Canonical mutation is submitted
- **WHEN** a client submits mutation.execute with an operation identity
- **THEN** Host Bridge SHALL delegate identity binding and duplicate admission to the Broker
- **AND** HTTP request identity and scope header SHALL not form part of that mutation identity.

#### Scenario: Same operation is replayed
- **WHEN** a non-canonical state-changing route repeats its declared generic operation id and request digest
- **THEN** Host Bridge SHALL return that route's persisted response or current receipt
- **AND** it SHALL not represent the result as canonical mutation evidence.

#### Scenario: Operation id is reused for different input
- **WHEN** a non-canonical route reuses an existing generic operation id with a different request digest
- **THEN** Host Bridge SHALL reject it with idempotency_conflict.

### Requirement: Unknown outcomes SHALL be inspectable

Callers SHALL distinguish committed and unchanged mutation receipts from failed, canceled, unknown, and repair_required mutation attempts. A lost response after a canonical mutation SHALL direct the caller to mutation.get_operation, whose read-only result is exactly running, settled with result, or unavailable.

#### Scenario: Response is lost after request transmission
- **WHEN** the CLI has transmitted a canonical mutation but cannot read a response
- **THEN** it SHALL report an unknown outcome and the operation id
- **AND** it SHALL direct the caller to canonical mutation observation instead of blind retry.

#### Scenario: Caller reads a mutation observation
- **WHEN** an authenticated caller requests an existing canonical mutation operation id
- **THEN** Host Bridge SHALL return only running, settled with result, or unavailable
- **AND** it SHALL not repeat execution.

#### Scenario: Caller reads an operation receipt
- **WHEN** an authenticated caller requests an existing canonical mutation operation id
- **THEN** Host Bridge SHALL return only the Broker observation state: running, settled with result, or unavailable
- **AND** it SHALL not return request data, timestamps, semantic input, or identity-binding details
- **AND** it SHALL not repeat execution.

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

### Requirement: Pending queue cancellation SHALL use operation receipts
State-changing queue cancellation SHALL participate in the existing operation-id idempotency contract without turning queue identity into a durable queue history.

#### Scenario: Cancellation operation is retried
- **WHEN** a client repeats the same cancel operation id and payload
- **THEN** Host Bridge SHALL replay the first result receipt
- **AND** it SHALL NOT attempt a second queue or backend transition

#### Scenario: Different operation id observes settled unit
- **WHEN** a later cancel request targets an admitted, canceled, settled, or unknown syntactically valid queue id
- **THEN** it SHALL return `not-pending`

### Requirement: Canonical mutation evidence SHALL retain permanent identity protection

Canonical mutation evidence SHALL retain committed, unchanged, failed, and canceled terminal evidence for 30 days, while unknown and repair_required evidence SHALL not age out automatically. When ordinary evidence is removed, minimum identity binding SHALL remain so identical input returns outcome_unavailable, different input remains conflict, and the operation id cannot execute again.

#### Scenario: Expired ordinary evidence is retried
- **WHEN** a caller resubmits an expired canonical operation identity with identical semantic input
- **THEN** execution SHALL fail with outcome_unavailable
- **AND** no Host effect is dispatched.
