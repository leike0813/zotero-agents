## ADDED Requirements

### Requirement: Production route evidence SHALL verify behavior rather than Rust source shape

The durable production-capability gate SHALL continue to compare the language-neutral manifest, operation metadata, grouped TypeScript contract, and surface corpora. Rust verification SHALL independently prove manifest fingerprint integrity, catalog completeness, plan validity, membership, and representative dispatch behavior. Acceptance evidence MUST NOT require a duplicated Rust ready roster, digest constant, fixed inventory count, registration macro, or dispatcher source-text pattern.

#### Scenario: Internal Rust organization changes without contract drift
- **WHEN** the manifest, grouped client, corpora, validated Rust catalog, and observable route behavior remain coherent
- **THEN** the production-capability gate passes without inspecting Rust implementation text

#### Scenario: Rust catalog loses a declared route
- **WHEN** the embedded manifest declares a capability with no Rust handler
- **THEN** Rust catalog validation fails before readiness
- **AND** language-neutral inventory evidence remains unchanged rather than being rewritten to hide the defect

