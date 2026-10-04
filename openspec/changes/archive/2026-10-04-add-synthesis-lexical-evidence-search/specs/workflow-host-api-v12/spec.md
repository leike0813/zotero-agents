# Spec Delta

## ADDED Requirements

### Requirement: Workflow Host SHALL project Synthesis evidence search explicitly
The v12 Workflow Host SHALL expose `synthesis.searchEvidence` as an explicit typed projection of `SynthesisClient.searchEvidence`, preserving the shared request/result DTO and stable Synthesis error behavior.

#### Scenario: Workflow searches Library evidence
- **WHEN** an authorized workflow invokes `host.synthesis.searchEvidence` with a valid request
- **THEN** the projection calls the grouped Synthesis client and returns the shared evidence-search result

#### Scenario: Synthesis runtime is unavailable
- **WHEN** the native Synthesis client cannot execute the operation
- **THEN** the projection returns the existing stable unavailable outcome and does not remove the declared v12 member
