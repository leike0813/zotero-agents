## ADDED Requirements

### Requirement: Rust candidate SHALL serve the Workbench chrome canary

The Rust candidate service SHALL expose authenticated `workbench.chrome.read` with the existing strict request/result DTO, response bounds, identity validation, and control-plane independence.

#### Scenario: Compute is saturated
- **WHEN** all compute admission is occupied and an authenticated chrome read is requested
- **THEN** the Rust main process returns the bounded projection without enqueueing worker work

#### Scenario: Identity or payload is invalid
- **WHEN** the request has an invalid service identity, unknown field, or out-of-bound value
- **THEN** the candidate rejects it with the existing stable protocol error and returns no projection
