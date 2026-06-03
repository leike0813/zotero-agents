## MODIFIED Requirements

### Requirement: Heavy reference matching stays out of refresh paths
Invariant guards SHALL prevent Reference Sidecar refresh and workflow apply from reconnecting advanced matcher or dedupe logic.

#### Scenario: Static guard scans refresh code
- **WHEN** tests inspect refresh/apply paths
- **THEN** they SHALL fail if those paths call advanced dedupe helpers, `buildReferenceMatcherIndex`, `resolveReferenceWithPolicy`, or write `synt_reference_match_proposal`.

### Requirement: Fuzzy dedupe is bounded
Invariant guards SHALL prevent fuzzy canonical dedupe from becoming an unbounded all-pairs scan.

#### Scenario: Static guard scans matcher code
- **WHEN** tests inspect the dedupe helper
- **THEN** they SHALL require bounded block and pair budget controls for fuzzy candidate generation.
