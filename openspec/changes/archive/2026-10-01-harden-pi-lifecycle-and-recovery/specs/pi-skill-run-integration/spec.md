## ADDED Requirements

### Requirement: Skill Run restoration retains request reservation and budget
Admission SHALL record Workflow reservation identity/policy and durable active-budget facts before execution. Recovery SHALL retain original request and prepared resources, restore waiting/suspended states and use process admission for safe continuation. Existing sealed-result Finalizer/apply/ack operations SHALL remain idempotent; unconfirmed claimed apply SHALL remain a hold. Resolved unknown outcomes SHALL offer explicit continue only.

#### Scenario: Safe continuation follows reconciliation
- **WHEN** all authoritative effects are reconciled and a valid checkpoint exists
- **THEN** the same request exposes explicit continuation with its remaining budget and no automatic model dispatch
