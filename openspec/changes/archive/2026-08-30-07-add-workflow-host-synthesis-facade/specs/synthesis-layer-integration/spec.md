## ADDED Requirements

### Requirement: Workflow Synthesis projection SHALL use four closed groups
The Workflow Synthesis projection SHALL expose exactly `workflowApply`, `topics`, `artifacts`, and `tags` groups. It SHALL contain fourteen callable members and MUST NOT expose flat compatibility aliases, a complete Synthesis client, native RPC methods, repository records, or transport controls.

#### Scenario: Grouped projection is inspected
- **WHEN** recursive contract conformance examines the Synthesis module
- **THEN** it finds the three `workflowApply` members, one `topics` member, one `artifacts` member, and nine `tags` members declared by the v12 manifest

### Requirement: Workflow apply contracts SHALL be canonical across languages
Literature digest apply, Topic plan apply, and Topic synthesis-result apply requests and results SHALL have one canonical declaration shared by Workflow projection, TypeScript client, and Rust application. Adapters MUST preserve the same discriminants and terminal semantics.

#### Scenario: Topic plan is applied
- **WHEN** a workflow submits a valid Topic plan with current optimistic basis
- **THEN** the Rust application returns the canonical apply result through the grouped Workflow adapter without a flat alias

#### Scenario: Topic plan persistence commits
- **WHEN** Topic-plan reconciliation atomically persists a new graph
- **THEN** the result is `persisted` and carries a canonical transaction receipt binding an opaque transaction identity, `topic_plan.reconcile`, the before and after graph hashes, and commit time

#### Scenario: Topic plan does not persist
- **WHEN** Topic-plan reconciliation returns `no_change`, `already_applied`, or `conflict`
- **THEN** the result receipt is `null`

#### Scenario: Topic relation would create a cycle
- **WHEN** a valid Topic plan proposes a broader relation that would create a graph cycle
- **THEN** the result reports the closed `relation_cycle` diagnostic rather than misclassifying the endpoints or throwing a repository error

### Requirement: Synthesis durable ownership SHALL remain native
Synthesis application state, repository transactions, CAS, staging, leases, fencing, cleanup, and internal operation telemetry SHALL remain in the Rust sidecar and its canonical contracts. Workflow callbacks and DTOs MUST NOT expose these mechanisms.

#### Scenario: Sidecar performs a durable promotion
- **WHEN** a grouped Workflow call requires durable Synthesis state change
- **THEN** the native application owns the transaction and the Workflow receives only the declared result DTO

### Requirement: Large canonical operations SHALL preserve their public limits
Topic-plan apply, tag-audit append, and regulator-vocabulary export SHALL use the existing transfer plane whenever their canonical payload exceeds the control-RPC envelope. Adapters MUST NOT silently reduce the 64 MiB, 8 MiB, or 16 MiB public limits.

#### Scenario: Valid Topic plan exceeds the control envelope
- **WHEN** a valid Topic plan is larger than the control-RPC limit but remains within its canonical public limits
- **THEN** composition transfers it through the bounded transfer plane and preserves the same typed result
