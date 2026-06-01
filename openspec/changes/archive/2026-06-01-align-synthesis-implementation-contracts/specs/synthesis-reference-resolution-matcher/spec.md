## MODIFIED Requirements

### Requirement: Reference matcher separates auto matches from suggestions

The matcher SHALL emit graph-safe auto matches separately from weaker suggested
candidates. Automatic matched citation edges require `status=matched` and
`confidence=deterministic` or `confidence=high`.

#### Scenario: Low-confidence title candidate exists

- **WHEN** exact, stripped, compact, or guarded fuzzy title evidence is useful
  but below the automatic-match threshold
- **THEN** the matcher SHALL return `suggested`, `unmatched`, or `ambiguous`
- **AND** the candidate SHALL be present only in bounded suggestions or review
  payload.

#### Scenario: Citation graph consumes matcher output

- **WHEN** matcher output is low-confidence or review-confidence
- **THEN** the Registry SHALL NOT store it as an automatic matched resolution
- **AND** the Citation Graph SHALL NOT materialize a matched edge from it.
