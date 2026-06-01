## MODIFIED Requirements

### Requirement: Reference matcher separates auto matches from suggestions

The matcher SHALL emit graph-safe auto matches separately from weaker suggested
candidates.

#### Scenario: Exact title and author evidence is below auto confidence

- **WHEN** a unique candidate is found only through exact/stripped/compact title
  plus author or year evidence
- **THEN** the matcher SHALL return `suggested` rather than `matched`
- **AND** the candidate SHALL be included in bounded `suggestedCandidates`.

#### Scenario: Dangerous near-neighbor appears

- **WHEN** a candidate matches a known dangerous near-neighbor pattern
- **THEN** the matcher SHALL NOT return an automatic `matched` result
- **AND** any candidate SHALL be suggestion-only or rejected by policy.

#### Scenario: Registry stores matcher output

- **WHEN** matcher output is `suggested`, `unmatched`, or `ambiguous`
- **THEN** the Registry SHALL NOT store it as an automatic matched resolution
- **AND** Citation Graph SHALL NOT create a matched edge from it.
