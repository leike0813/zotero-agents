## ADDED Requirements

### Requirement: Docs distinguish lightweight and advanced reference matching
Active Synthesis docs SHALL describe lightweight sidecar binding and explicit advanced reference matching as separate algorithms with separate triggers.

#### Scenario: Developer reads reference matching docs
- **WHEN** docs describe Reference Sidecar refresh or workflow apply
- **THEN** they SHALL identify the lightweight deterministic binding path
- **AND** they SHALL NOT imply that heavy matcher proposals are produced automatically.

#### Scenario: Developer reads advanced matching docs
- **WHEN** docs describe Advanced Reference Matching
- **THEN** they SHALL state that it is user-triggered, may auto-accept deterministic/high-confidence results, and stores uncertain results as proposals.

