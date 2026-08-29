## ADDED Requirements

### Requirement: Rust Topic application SHALL expose typed library entry points

The Rust application crate SHALL expose typed `list`, `detail`, `apply`, `stop_admission`, and bounded `shutdown` entry points using the existing Topic request/result limits and stable status, error, and warning codes. It SHALL NOT expose a generic application-kind executor or remote Topic mutation capability.

#### Scenario: Typed boundary is audited
- **WHEN** Rust application exports and candidate capabilities are inspected
- **THEN** Topic behavior is reachable through typed library APIs
- **AND** no `ApplicationKind`, generic application command, string compute port, HTTP apply capability, or hidden Node fallback exists

### Requirement: Rust Topic commit and follow-up semantics SHALL match the oracle

The Rust Topic application SHALL support `create`, `update_full`, and `update_patch`, inject a typed Structured Artifact engine, use canonical promotion as the only domain commit point, and treat post-promotion projection or operation-receipt failure as an ordered stable warning without rolling back current.

#### Scenario: Failure occurs around the commit point
- **WHEN** validation, compute, basis, or promotion fails before commit
- **THEN** no canonical current, Topic state, or Topic projection is written
- **AND WHEN** projection or receipt fails after promotion
- **THEN** current remains committed and success contains the matching stable warning

### Requirement: Rust Topic admission shutdown SHALL drain active applies

Stopping admission SHALL reject new apply requests while allowing already admitted applies to reach a terminal state. Shutdown SHALL wait only within its supplied bound for active applies and SHALL preserve reopen consistency.

#### Scenario: Shutdown overlaps an apply
- **WHEN** admission stops while one apply is active and another apply arrives
- **THEN** the new apply is rejected with the stable admission code
- **AND** bounded shutdown either observes the first apply drain or reports the stable drain timeout without corrupting durable state
