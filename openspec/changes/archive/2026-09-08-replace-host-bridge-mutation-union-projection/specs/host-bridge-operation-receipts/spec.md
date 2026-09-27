## ADDED Requirements

### Requirement: Canonical receipts are observed independently of HTTP operations
Typed mutation execute projections SHALL preserve the existing Broker identity binding, duplicate admission, retention, replay, and `mutation.get_operation` observation semantics. The projection SHALL not create a second generic operation record.

#### Scenario: Client retries a typed mutation
- **WHEN** a caller reuses the same explicit operation id for the same typed execute intent
- **THEN** the Broker canonical authority determines the replay or conflict outcome
- **AND** the Bridge does not execute a duplicate effect.
