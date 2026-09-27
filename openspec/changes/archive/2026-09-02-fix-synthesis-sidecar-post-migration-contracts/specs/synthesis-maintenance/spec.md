## ADDED Requirements

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
