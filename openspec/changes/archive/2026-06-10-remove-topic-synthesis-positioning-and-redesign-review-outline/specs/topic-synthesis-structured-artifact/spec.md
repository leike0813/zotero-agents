# topic-synthesis-structured-artifact Delta

## MODIFIED Requirements

### Requirement: Complete topic artifact sections

The complete topic synthesis artifact SHALL NOT include a top-level
`positioning` section.

#### Scenario: Complete manifest removes positioning

- **WHEN** split finalize materializes a complete topic artifact
- **THEN** the manifest sections do not include `positioning`
- **AND** the assembled artifact does not include `positioning`

### Requirement: Topic scope boundary

The topic section SHALL be the only artifact section that carries the topic
scope boundary.

#### Scenario: Topic scope is authoritative

- **WHEN** a complete artifact is validated
- **THEN** `topic.scope_boundary` is accepted as the topic boundary
- **AND** no `positioning.scope_boundary` is required or accepted as a
  contract field

### Requirement: Review writing strategies

The review outline section SHALL describe review-writing strategies.

#### Scenario: Review outline has strategies

- **WHEN** a complete artifact is validated
- **THEN** `review_outline.topic_importance` is present
- **AND** `review_outline.writing_strategies` contains at least one strategy
- **AND** `review_outline.recommended_strategy_id` references an existing
  strategy id
- **AND** strategy `source_paper_refs` reference existing source papers
