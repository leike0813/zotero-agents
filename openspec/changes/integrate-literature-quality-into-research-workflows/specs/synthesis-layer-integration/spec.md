## MODIFIED Requirements

### Requirement: Paper artifact completeness has one four-artifact source of truth

Registry completeness, artifact reads and exports, Topic material readiness, freshness snapshots, and Index artifact state SHALL use `digest`, `references`, `citation_analysis`, and `literature_score` as one shared set.

#### Scenario: Only literature score is missing
- **WHEN** digest, references, and citation analysis are available but literature score is missing
- **THEN** artifact coverage SHALL be `partial`
- **AND** the reference facet SHALL remain determined only by references and citation analysis.

#### Scenario: Literature score is invalid
- **WHEN** a score payload cannot be decoded or fails `literature_score.v1` validation
- **THEN** its artifact status SHALL be `error`
- **AND** it SHALL be unavailable for completeness.

### Requirement: Literature quality projection is shared

Research workflows SHALL consume one compact validated quality snapshot and one confidence-weighted quality prior.

#### Scenario: Valid score is projected
- **WHEN** a valid `literature_score.v1` payload is read
- **THEN** the snapshot SHALL include schema, rubric, paper type, score, confidence, confidence-adjusted score, quality prior, and payload hash.

#### Scenario: Score is missing or invalid
- **WHEN** a score is missing or invalid
- **THEN** quality prior SHALL be `0.5`
- **AND** a stable missing or invalid diagnostic SHALL be recorded.
