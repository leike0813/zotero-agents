## ADDED Requirements

### Requirement: Cross-language contracts SHALL cover durable parity

Versioned language-neutral fixtures SHALL describe repository inputs and normalized rows, canonical snapshots and hashes, application requests/results, stable error codes, sorted full-table state, receipts, and named recovery phases.

#### Scenario: Durable corpus is validated
- **WHEN** TypeScript and Rust contract checkers load the R7 corpus
- **THEN** both reject malformed fixtures and produce identical normalized observable values for every accepted fixture

### Requirement: Durable parity reports SHALL record implementation identity

Differential reports SHALL include schema/corpus versions and Node/Rust source-build fingerprints while excluding profile paths, credentials, and mutable owner locations.

#### Scenario: Parity evidence is reviewed
- **WHEN** an R7 report is emitted
- **THEN** reviewers can identify both implementations and the exact fixture contract without receiving a live root or secret
