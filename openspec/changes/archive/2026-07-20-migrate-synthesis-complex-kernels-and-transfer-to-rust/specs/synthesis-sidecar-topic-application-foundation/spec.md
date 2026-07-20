## ADDED Requirements

### Requirement: Topic application SHALL receive a Rust pool adapter
Private Topic application composition SHALL inject a pool-backed Structured Artifact engine implementing the existing application port and SHALL preserve validation, assembly, patch conflicts, canonical promotion, projection warnings, and operation lifecycle.

#### Scenario: Rust Topic operation fails before promotion
- **WHEN** validation, assembly, or patch computation is canceled, times out, crashes, or returns invalid output
- **THEN** the apply operation SHALL fail before the canonical commit point
- **AND** no current Topic state or derived projection SHALL change.
