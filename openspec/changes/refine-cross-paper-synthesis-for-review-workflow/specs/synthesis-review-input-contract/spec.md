# synthesis-review-input-contract

## ADDED Requirements

### Requirement: Review input exposes review-oriented synthesis structures

The review workflow input SHALL expose structures needed by future literature
review workflows.

#### Scenario: Review input includes synthesis structures

- **WHEN** `synthesis.get_review_input` returns a complete topic synthesis
  artifact
- **THEN** it SHALL include positioning, taxonomy, comparison matrix, debates,
  review outline, and evidence map
- **AND** it SHALL mark the input incomplete when these structures are missing.
