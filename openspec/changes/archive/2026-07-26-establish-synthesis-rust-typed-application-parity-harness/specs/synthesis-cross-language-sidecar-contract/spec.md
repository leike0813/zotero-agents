## MODIFIED Requirements

### Requirement: Cross-language contracts SHALL cover durable parity

The durable-foundation corpus SHALL describe repository inputs and normalized rows, canonical snapshots and hashes, sorted full-table state, receipts, and named recovery phases. Typed application requests, results, lifecycle, warnings, and application-specific durable effects SHALL be governed by a separate versioned typed-application corpus and SHALL NOT be inferred from a family inventory in the durable corpus.

#### Scenario: Durable and application corpora are validated
- **WHEN** TypeScript and Rust contract checkers load the R7 fixtures
- **THEN** both reject malformed fixtures and produce identical normalized observable values for every accepted fixture
- **AND** each report identifies whether it proves durable foundation or a named typed application slice

### Requirement: Durable parity reports SHALL record implementation identity

Differential reports SHALL include schema/corpus versions and Node/Rust source fingerprints while excluding profile paths, credentials, mutable owner identities, and temporary owner locations. Application reports SHALL compare stable codes and exact DTO/durable values without fuzzy text, ordering, hash, or byte normalization.

#### Scenario: Parity evidence is reviewed
- **WHEN** an R7 report is emitted
- **THEN** reviewers can identify both implementations, the exact fixture contract, and the typed application families covered without receiving a live root or secret
