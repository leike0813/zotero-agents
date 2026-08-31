# synthesis-reference-graph-maintenance-control Specification

## Purpose

Reference sidecar refresh and citation graph update are independent, approval-gated public asynchronous operations with typed receipts.

## Requirements

### Requirement: Reference sidecar refresh SHALL be a public asynchronous operation
Host Bridge SHALL expose an approval-gated `reference_sidecar.refresh` capability with paper or library scope and a typed Synthesis operation receipt.

#### Scenario: Agent refreshes selected papers
- **WHEN** an agent requests sidecar refresh for normalized paper refs from one library
- **THEN** Host Bridge returns an operation handle
- **AND** terminal status reports processed, changed, skipped, and failed paper refs plus a reference basis hash.

### Requirement: Citation graph update SHALL be a separate public operation
Host Bridge SHALL expose an independently approved `citation_graph.update` capability that never runs inside the reference-sidecar transaction.

#### Scenario: Agent updates a graph from a sidecar basis
- **WHEN** an agent submits a graph update with an expected reference basis hash
- **THEN** Host Bridge rejects a mismatched basis before writing
- **AND** a successful update commits an atomic graph projection without changing sidecar facts.

### Requirement: Maintenance operation retry SHALL be idempotent
Each public maintenance operation SHALL accept an idempotency key bound to a normalized request hash.

#### Scenario: Idempotency key is reused
- **WHEN** the same key and normalized request are submitted again
- **THEN** Host Bridge returns the original running or terminal operation
- **AND** the same key with a different request is rejected as a conflict.

### Requirement: No-argument Citation Graph retry SHALL replan from current facts

The existing no-argument Citation Graph rebuild retry capability SHALL create a fresh graph attempt. It SHALL reuse only the Full or Incremental mode of the most recent failed graph command and SHALL derive concrete scope, Reference facts, cache delta, and Host input from current state. It SHALL NOT replay stored source identifiers, worker payloads, or operation identities.

#### Scenario: The latest failed command was a full rebuild
- **WHEN** the no-argument retry capability is invoked after a failed Full graph command
- **THEN** it starts a new Full attempt using current Reference and Host facts
- **AND** a readable last-good graph does not suppress that explicit retry

#### Scenario: The latest failed command was incremental
- **WHEN** the no-argument retry capability is invoked after a failed Incremental graph command
- **THEN** it starts a new Incremental attempt using the current bounded stale delta
- **AND** it does not copy the failed attempt's stored source scope

#### Scenario: No failed mode is available
- **WHEN** no failed graph command exists and current cache state does not safely determine missing, failed, or stale graph work
- **THEN** the capability returns the existing retry-unavailable outcome without dispatching graph work
