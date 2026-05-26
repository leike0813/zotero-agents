## ADDED Requirements

### Requirement: Runtime validates KG proposal sidecars before final render

The topic synthesis runtime SHALL validate and register KG proposal sidecars before final artifact validation.

#### Scenario: KG proposal payload is persisted

- **WHEN** `persist_kg_proposals` receives a valid combined KG proposal payload
- **THEN** runtime SHALL write concept cards to `result/sidecars/concept-cards-proposal.json`
- **AND** write topic graph relation proposals to `result/sidecars/topic-graph-relation-proposals.json`
- **AND** register both artifacts with hashes.

#### Scenario: Final validation runs without KG sidecars

- **WHEN** `validate_final_artifacts` runs for a completed create/update result and either KG sidecar is missing or hash-mismatched
- **THEN** runtime SHALL reject final validation before writing `result/result.json`.
