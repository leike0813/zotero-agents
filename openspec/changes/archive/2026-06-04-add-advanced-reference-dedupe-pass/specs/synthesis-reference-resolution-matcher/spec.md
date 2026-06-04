## MODIFIED Requirements

### Requirement: Matcher output affects graph only through explicit decisions or safe apply
Reference matcher output SHALL become graph-affecting state only through deterministic safe apply for the current item, deterministic/high-confidence explicit advanced matching, or explicit user-approved sidecar decisions.

#### Scenario: Fuzzy canonical dedupe candidate is produced
- **WHEN** Advanced Reference Matching finds a fuzzy canonical-to-canonical candidate
- **THEN** Synthesis SHALL store it only as a `canonical_merge` proposal
- **AND** it SHALL NOT write a canonical redirect automatically.

## ADDED Requirements

### Requirement: Advanced matching includes external dedupe
Advanced Reference Matching SHALL include an explicit external dedupe pass that compares unbound effective canonical references.

#### Scenario: Duplicate canonical references share a strong identifier
- **WHEN** unbound canonical references share a unique DOI or arXiv identity
- **THEN** Advanced Reference Matching MAY write an accepted canonical redirect
- **AND** it SHALL mark citation graph cache stale without rebuilding graph cache.

#### Scenario: Duplicate canonical references share title evidence
- **WHEN** unbound canonical references share normalized, compact, or strong compact title evidence
- **THEN** Advanced Reference Matching SHALL either write a safe redirect or create a bounded `canonical_merge` proposal according to the dedupe policy.

### Requirement: Refresh remains lightweight
Reference Sidecar refresh and workflow apply SHALL NOT run the advanced external dedupe pass.

#### Scenario: Refresh processes changed references
- **WHEN** refresh or workflow apply inserts raw references
- **THEN** it SHALL keep lightweight canonical assignment and binding behavior
- **AND** it SHALL NOT create advanced fuzzy `canonical_merge` proposals.
