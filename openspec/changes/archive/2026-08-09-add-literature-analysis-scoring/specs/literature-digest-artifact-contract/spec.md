## ADDED Requirements

### Requirement: Literature score SHALL use a native portable artifact contract

Literature score export and import SHALL preserve the native
`literature_score.v1` JSON as the portable source artifact.

#### Scenario: Score note is exported

- **WHEN** a literature-score generated note is exported
- **THEN** its embedded payload SHALL export as native `literature_score.json`
- **AND** the external artifact SHALL be the bare `literature_score.v1` object.

#### Scenario: Score artifact is imported

- **WHEN** a valid native `literature_score.json` is imported
- **THEN** import SHALL use the canonical generated-note writer
- **AND** it SHALL rebuild the readable body and radar image from the JSON.

#### Scenario: Literature or research bundle is round-tripped

- **WHEN** a bundle containing a score is exported and imported
- **THEN** the score payload SHALL be preserved
- **AND** derived image attachment keys SHALL be remapped or rebuilt without
  changing the score JSON.
