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

### Requirement: Synthesis durable ownership SHALL remain native
Synthesis application state, repository transactions, CAS, staging, leases, fencing, cleanup, and internal operation telemetry SHALL remain in the Rust sidecar and its canonical contracts. Workflow callbacks and DTOs MUST NOT expose these mechanisms.

#### Scenario: Sidecar performs a durable promotion
- **WHEN** a grouped Workflow call requires durable Synthesis state change
- **THEN** the native application owns the transaction and the Workflow receives only the declared result DTO
