## ADDED Requirements

### Requirement: Reference resolution fixtures are complete and sanitized

The system SHALL provide a full-current-library reference resolution fixture
that is safe to commit and contains one gold label per reference instance.

#### Scenario: Fixture covers every reference instance

- **WHEN** the fixture is loaded
- **THEN** every reference instance SHALL have exactly one gold label
- **AND** no gold label SHALL reference a missing reference instance.

#### Scenario: Fixture contains no local private data

- **WHEN** the fixture JSON files are inspected
- **THEN** they SHALL NOT contain local absolute paths, bridge tokens, Zotero
  profile paths, or full note HTML.

### Requirement: Reference matcher separates auto matches from suggestions

The matcher SHALL emit graph-safe auto matches separately from weaker suggested
candidates.

#### Scenario: Strong identity match is unique

- **WHEN** a reference has a unique DOI, arXiv, URL, citeKey, or equivalent raw
  identifier match to a library paper
- **THEN** the matcher SHALL return `matched`
- **AND** the target SHALL be eligible for citation graph matched edges.

#### Scenario: Candidate is useful but below auto-match confidence

- **WHEN** a reference has a plausible but not graph-safe candidate
- **THEN** the matcher SHALL leave the resolution unresolved or ambiguous
- **AND** it SHALL include that candidate in `suggested_candidates`.

#### Scenario: Dangerous near-neighbor appears

- **WHEN** a reference resembles a known dangerous near-neighbor pair
- **THEN** the matcher SHALL NOT auto-match it
- **AND** evaluation SHALL count any such auto-match as a danger false positive.

### Requirement: Evaluation reports policy quality

The evaluation harness SHALL compare matcher policies against the fixture gold
labels and report precision, recall, F1, candidate recall, and dangerous-pair
false positives.

#### Scenario: Policies are evaluated

- **WHEN** the evaluation harness runs on the current-library fixture
- **THEN** it SHALL return metrics for baseline and policies A through D
- **AND** it SHALL identify false positives and false negatives by reference
  instance id.

### Requirement: Literature registry uses the production matcher

The literature registry SHALL use the selected production matcher for reference
resolution and SHALL preserve suggestions for review without creating matched
citation edges.

#### Scenario: Low-confidence suggestion exists

- **WHEN** the matcher returns only suggested candidates
- **THEN** the reference resolution SHALL NOT be stored as `matched`
- **AND** the review payload or diagnostics SHALL include those candidates.
