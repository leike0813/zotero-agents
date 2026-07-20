## ADDED Requirements

### Requirement: Matching application SHALL receive a Rust pool adapter
Private reference matching composition SHALL inject a pool-backed matcher engine implementing the existing application port and SHALL preserve preparation, basis recapture, single-use promotion, review, and repository transaction semantics.

#### Scenario: Rust matcher fails before apply
- **WHEN** either matcher operation is canceled, times out, crashes, or returns invalid output
- **THEN** preparation SHALL fail without changing proposals, bindings, redirects, or readiness
- **AND** no in-process fallback SHALL run.
