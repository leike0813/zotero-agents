# synthesis-maintenance Specification

## Purpose
Synthesis maintenance is explicit and observable; it is not a background worker subsystem.

## Requirements

### Requirement: Maintenance is explicit operation only
Synthesis maintenance SHALL run only as explicit user/debug operations or bounded workflow apply sidecar sync.

#### Scenario: Maintenance status is read
- **WHEN** UI or Host Bridge reads maintenance state
- **THEN** it SHALL return explicit operation status and cache diagnostics
- **AND** it SHALL NOT expose background worker queue state.

### Requirement: Synthesis maintenance SHALL expose safe status and constrained invalidation

Synthesis maintenance controls SHALL provide agent-readable status and approval-gated invalidation without exposing raw debug reset controls.

#### Scenario: Status is read-only

- **WHEN** a client requests synthesis cache or index status
- **THEN** the response contains lightweight health, freshness, and availability summaries
- **AND** no cache or index state is mutated.

#### Scenario: Invalidation rejects unsupported scopes

- **WHEN** a client requests cache invalidation for an unsupported scope
- **THEN** the operation fails with a stable `unsupported_cache_scope` error
- **AND** no debug reset, SQL, JS, path, or arbitrary table operation is executed.

### Requirement: Maintenance projections share one safe contract

Synthesis maintenance status, schema summaries, paging bounds, canonicalization, and snapshot diff SHALL use shared strict projection builders while production mutation ownership and public results remain unchanged.

#### Scenario: Production and private status are projected
- **WHEN** either composition requests status, schema, cache, operation, or diff information
- **THEN** both SHALL apply the same JSON-safety, redaction, ordering, cursor, truncation, and diagnostic rules

#### Scenario: Production-only maintenance remains in production
- **WHEN** migration inventory classifies legacy JSON import, Host paper details, a production profiler source, or clean-install reset
- **THEN** those capabilities SHALL remain with their current safe production owner and SHALL NOT be copied into Node

### Requirement: Public maintenance operations SHALL expose typed terminal receipts
Reference-sidecar and citation-graph maintenance receipts SHALL report normalized scope, operation state, actual state change, counts, diagnostics, retryability, and safe next actions.

#### Scenario: Sidecar batch partially succeeds
- **WHEN** at least one paper commits and at least one paper fails
- **THEN** operation lifecycle may be completed with outcome `partial`
- **AND** the receipt identifies successful and failed paper refs without claiming a full rollback.

#### Scenario: Graph update fails
- **WHEN** graph update fails before atomic commit
- **THEN** the previous graph remains readable
- **AND** the receipt reports failed with no graph state change.

### Requirement: Public maintenance terminal receipts SHALL be canonical for every terminal outcome

Every public maintenance operation view SHALL expose a receipt matching the existing `synthesis.maintenance_receipt.v1` contract. Worker-private result fields and legacy stored receipt shapes SHALL be converted at the projection boundary.

#### Scenario: A worker returns a private failure shape

- **WHEN** a maintenance worker returns fields such as `ok`, `status`, or `operation_id` instead of a public receipt
- **THEN** the operation is exposed with a canonical failed receipt
- **AND** the receipt retains a safe diagnostic such as `worker_result_invalid` and the retryable meaning.

#### Scenario: An existing failed operation contains a legacy receipt

- **WHEN** a public operation is read after restart and its durable diagnostics contain a legacy worker result
- **THEN** the returned view contains a valid canonical receipt
- **AND** reading the operation does not fail protocol validation.

#### Scenario: A terminal operation is written

- **WHEN** a public operation completes, fails, is canceled, times out, or fails to spawn
- **THEN** the durable terminal receipt uses the same public union
- **AND** subsequent terminal reads return the same semantic outcome without exposing the worker payload.
