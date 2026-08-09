## ADDED Requirements

### Requirement: Literature analysis SHALL route by generated-note readiness

The workflow SHALL derive one internal mode from the selected parent item's
generated notes without exposing `score_only` as a workflow parameter.

#### Scenario: Complete legacy triplet needs only a score

- **GIVEN** digest, references, and citation-analysis notes are present
- **AND** no valid literature-score payload is present
- **WHEN** literature-analysis builds its request
- **THEN** it SHALL run the literature-analysis Skill with `score_only: true`
- **AND** it SHALL omit tag-regulator.

#### Scenario: Any legacy artifact is absent

- **GIVEN** at least one of digest, references, or citation-analysis is absent
- **WHEN** literature-analysis builds its request
- **THEN** it SHALL run with `score_only: false`
- **AND** it MAY include tag-regulator according to the public option.

#### Scenario: All four artifacts are available

- **GIVEN** the legacy triplet and a valid literature-score payload are present
- **WHEN** workflow availability or request construction is evaluated
- **THEN** the parent item SHALL be rejected as an input.

#### Scenario: Marked score note has an invalid payload

- **GIVEN** the legacy triplet is present
- **AND** a literature-score note has no decodable valid score payload
- **WHEN** readiness is evaluated
- **THEN** the score SHALL be treated as unavailable
- **AND** the workflow SHALL remain available in score-only mode.

### Requirement: Literature analysis apply SHALL honor the submitted mode

Literature analysis apply SHALL use the internal mode captured by the submitted
request and SHALL validate only the artifacts owned by that mode.

#### Scenario: Score-only result is applied

- **WHEN** a score-only request succeeds
- **THEN** apply SHALL read only `literature_score_path`
- **AND** it SHALL create or update only the literature-score note
- **AND** it SHALL ignore digest, references, and citation-analysis paths.

#### Scenario: Full result is applied

- **WHEN** a full request succeeds
- **THEN** apply SHALL require and apply digest, references, citation-analysis,
  and literature-score artifacts.

#### Scenario: Legacy result has no score path

- **WHEN** a new workflow apply receives a result without
  `literature_score_path`
- **THEN** apply SHALL reject the result and require a new run.

### Requirement: Literature analysis SHALL project a supported parent identifier

The workflow SHALL derive the optional literature-analysis Skill identifier
from the selected parent item without exposing it as a workflow parameter.

#### Scenario: Parent has a DOI or arXiv identifier

- **GIVEN** the selected parent item has a DOI or an arXiv identifier in a
  supported Zotero metadata location
- **WHEN** literature-analysis builds either a full or score-only request
- **THEN** it SHALL pass the normalized value as `parameter.identifier` to the
  literature-analysis Skill step.

#### Scenario: Parent has no supported identifier

- **GIVEN** the selected parent item has no DOI or arXiv identifier
- **WHEN** literature-analysis builds its request
- **THEN** it SHALL omit `parameter.identifier`
- **AND** it SHALL NOT pass an ISBN or PMID as the Skill identifier.
