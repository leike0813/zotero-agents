## MODIFIED Requirements

### Requirement: Rust candidate SHALL serve the Workbench chrome canary

The Rust candidate service SHALL expose authenticated `workbench.chrome.read` with the existing strict request/result DTO, response bounds, identity validation, and control-plane independence. A typed Workbench application SHALL own its two fixed cache readiness entries, running and current-failure bounds, newer-success suppression, deterministic `updatedAt desc` plus `operationId` ordering, and progress/source/detail projection.

#### Scenario: Compute is saturated
- **WHEN** all compute admission is occupied and an authenticated chrome read is requested
- **THEN** the Rust main process returns the bounded projection without enqueueing worker work

#### Scenario: Identity or payload is invalid
- **WHEN** the request has an invalid service identity, unknown field, or out-of-bound value
- **THEN** the candidate rejects it with the existing stable protocol error and returns no projection

#### Scenario: An older failure has been superseded
- **WHEN** a failed cache operation is followed by a newer successful operation for the same cache source
- **THEN** the failure is absent from current failures while other bounded running and failed jobs retain deterministic ordering
