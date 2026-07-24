## ADDED Requirements

### Requirement: Pending queue cancellation SHALL use operation receipts
State-changing queue cancellation SHALL participate in the existing operation-id idempotency contract without turning queue identity into a durable queue history.

#### Scenario: Cancellation operation is retried
- **WHEN** a client repeats the same cancel operation id and payload
- **THEN** Host Bridge SHALL replay the first result receipt
- **AND** it SHALL NOT attempt a second queue or backend transition

#### Scenario: Different operation id observes settled unit
- **WHEN** a later cancel request targets an admitted, canceled, settled, or unknown syntactically valid queue id
- **THEN** it SHALL return `not-pending`
