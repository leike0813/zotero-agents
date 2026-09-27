## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Canonical mutation evidence SHALL retain permanent identity protection

Canonical mutation evidence SHALL retain committed, unchanged, failed, and canceled terminal evidence for 30 days, while unknown and repair_required evidence SHALL not age out automatically. When ordinary evidence is removed, minimum identity binding SHALL remain so identical input returns outcome_unavailable, different input remains conflict, and the operation id cannot execute again.

#### Scenario: Expired ordinary evidence is retried
- **WHEN** a caller resubmits an expired canonical operation identity with identical semantic input
- **THEN** execution SHALL fail with outcome_unavailable
- **AND** no Host effect is dispatched.
