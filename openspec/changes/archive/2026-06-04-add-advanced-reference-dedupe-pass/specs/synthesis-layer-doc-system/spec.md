## MODIFIED Requirements

### Requirement: Docs distinguish lightweight and advanced reference matching
Active Synthesis docs SHALL describe Reference Sidecar refresh, Advanced Reference Binding, and Advanced External Dedupe as separate algorithms with separate triggers and materialization policy.

#### Scenario: Developer reads matching docs
- **WHEN** docs describe Advanced Reference Matching
- **THEN** they SHALL state that binding and external dedupe are separate passes
- **AND** fuzzy external dedupe SHALL be documented as review-only in this version.
