## ADDED Requirements

### Requirement: Source and build fingerprints SHALL include the Rust durable foundation

The source/build inventory SHALL include the repository, canonical-store, and application crates, their contract fixtures, exact Cargo dependency graph, and the two read canary registrations in addition to all fifteen compute operations.

#### Scenario: Durable source changes without a rebuilt candidate
- **WHEN** any inventoried durable source, fixture, feature, or dependency changes while candidate metadata remains unchanged
- **THEN** freshness and source/build parity checks fail

### Requirement: Candidate smoke SHALL cover compute and durable reads

Candidate smoke SHALL execute all fifteen compute operations plus authenticated `workbench.chrome.read` and `topics.canonical.inspect`, including invalid identity/payload and bounded-result cases.

#### Scenario: Smoke inventory is incomplete
- **WHEN** the built candidate omits a compute operation or one of the two read canaries
- **THEN** source/build smoke fails before packaging acceptance
