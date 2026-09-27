## MODIFIED Requirements

### Requirement: State-changing requests SHALL be idempotent by operation id

Host Bridge SHALL retain generic HTTP operation history only for routes that explicitly use it. Canonical Zotero mutation identity, admission, receipt, attempt, and observation SHALL be owned by the Broker under a stable caller namespace shared by Bridge, inbound MCP, and CLI. HTTP request IDs, connections, and scope headers SHALL not participate in canonical mutation identity.

#### Scenario: Canonical mutation is submitted
- **WHEN** a client submits an operation-specific mutation for execution with an operation identity
- **THEN** Host Bridge SHALL delegate identity binding and duplicate admission to the Broker
- **AND** HTTP request identity and scope header SHALL not form part of that mutation identity.

#### Scenario: Same operation is replayed
- **WHEN** a non-canonical state-changing route repeats its declared generic operation id and request digest
- **THEN** Host Bridge SHALL return that route's persisted response or current receipt
- **AND** it SHALL not represent the result as canonical mutation evidence.

#### Scenario: Operation id is reused for different input
- **WHEN** a non-canonical route reuses an existing generic operation id with a different request digest
- **THEN** Host Bridge SHALL reject it with idempotency_conflict.

#### Scenario: State-changing v2 route omits operation identity
- **WHEN** a client submits a non-canonical state-changing `/bridge/v2/` request without an operation id
- **THEN** Host Bridge SHALL reject it with `operation_id_required` before the route effect begins.

