## MODIFIED Requirements

### Requirement: Final artifacts are file-authored and validated

Final topic synthesis sections and sidecars SHALL be authored as fixed-path
files and then indexed by runtime-generated manifests.

#### Scenario: Final manifest lists sidecars

- **WHEN** `validate_final_artifacts` runs
- **THEN** it SHALL generate `result/topic-analysis.json` or
  `result/topic-analysis.patch.json`
- **AND** the manifest SHALL contain a `sidecars` object with
  `topic_interest_metadata`, `concept_cards_proposal`, and
  `topic_graph_relation_proposals`
- **AND** each sidecar entry SHALL include `path`, `hash`, `content_type`, and
  `schema_id` from the registered artifact.

### Requirement: Runtime validates KG proposal sidecars before final render

The topic synthesis runtime SHALL validate and register KG proposal sidecars
before final artifact validation.

#### Scenario: KG proposal payload is persisted

- **WHEN** `persist_kg_proposals` receives a valid combined KG proposal payload
- **THEN** runtime SHALL write concept cards to
  `result/sidecars/concept-cards-proposal.json`
- **AND** write topic graph relation proposals to
  `result/sidecars/topic-graph-relation-proposals.json`
- **AND** write topic interest metadata to
  `result/sidecars/topic-interest-metadata.json`
- **AND** register all three artifacts with hashes.

#### Scenario: Final validation runs without required sidecars

- **WHEN** `validate_final_artifacts` runs for a completed create/update result
  and any required sidecar is missing or hash-mismatched
- **THEN** runtime SHALL reject final validation before writing
  `result/result.json`.
