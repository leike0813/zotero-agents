## ADDED Requirements

### Requirement: Native production routes SHALL form one validated executable catalog

Before publishing readiness, the native sidecar SHALL combine the manifest-owned capability inventory and operation policies with the Rust-owned handlers and execution behavior. Every declared capability MUST have exactly one handler and a valid execution plan; no undeclared or duplicate handler MAY be admitted. All detected catalog issues SHALL be reported together and startup SHALL fail before ready publication.

#### Scenario: Complete catalog starts
- **WHEN** every manifest capability has exactly one handler, valid policy, and valid execution plan
- **THEN** the native sidecar publishes the complete production capability inventory in manifest order
- **AND** every published capability can be dispatched through the same validated catalog

#### Scenario: Catalog contains several defects
- **WHEN** startup finds missing, duplicate, undeclared, policy-less, or invalid-plan routes
- **THEN** startup reports every detected issue with its issue category and route identity
- **AND** the sidecar does not publish readiness or dispatch application code

### Requirement: Production capability fingerprint SHALL be independently verified

The native sidecar SHALL recompute the production capability fingerprint from the manifest capability identifiers sorted by their current canonical ordering, joined with LF separators, and terminated by one LF. The recomputed SHA-256 digest MUST match the manifest fingerprint before readiness is published. A separate Rust digest constant or ready-roster copy MUST NOT serve as verification evidence.

#### Scenario: Embedded capability manifest is intact
- **WHEN** startup recomputes the fingerprint for the embedded capability inventory
- **THEN** the digest matches the manifest fingerprint
- **AND** catalog validation may continue

#### Scenario: Capability content and fingerprint disagree
- **WHEN** the manifest capability identifiers do not produce the declared fingerprint
- **THEN** startup rejects the catalog before ready publication

### Requirement: Native route execution SHALL use a closed execution plan

The validated catalog SHALL execute production requests through a closed plan that combines manifest-owned lifecycle and data-plane policy with Rust-owned typed handler, special execution step, and canonical-effect semantics. Production routing MUST NOT accept runtime route registration, arbitrary executor callbacks, or capability-string branches outside the validated catalog. Transfer, maintenance, delivery, canonical autosync, deadlines, receipts, and stable error behavior SHALL remain compatible with the current wire contract.

#### Scenario: Route combines several execution concerns
- **WHEN** a declared route requires transfer processing, typed dispatch, and canonical change observation
- **THEN** the validated plan applies those concerns in the established wire-compatible order
- **AND** no caller interprets or mutates the plan

#### Scenario: Unknown production route is requested
- **WHEN** a production request or production-result transfer manifest names an undeclared capability
- **THEN** the validated catalog rejects membership before application dispatch or transfer-session creation

