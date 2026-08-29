## ADDED Requirements

### Requirement: R7 SHALL complete durable parity without advancing native lifecycle

R7 SHALL implement and verify Rust repository, canonical store, all private applications, two read-only candidate canaries, and five-target durability gates while leaving native manifest/lifecycle to R8 and production writer cutover to R9.

#### Scenario: R7 completion is claimed
- **WHEN** migration status and acceptance evidence are reviewed
- **THEN** repository/canonical/application parity is complete, R6 is recorded complete, and no R8 installer/supervisor or R9 production ownership claim is present

### Requirement: Node SHALL remain a frozen oracle only

The Node implementation SHALL remain available for differential tests but SHALL receive no new production route, fallback branch, or shared mutable ownership.

#### Scenario: Candidate failure occurs
- **WHEN** the Rust candidate fails a request or durability test
- **THEN** the failure remains visible and no runtime path executes the Node implementation as a fallback
