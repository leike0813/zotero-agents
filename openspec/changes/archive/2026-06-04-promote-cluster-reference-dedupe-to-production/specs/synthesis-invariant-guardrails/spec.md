## ADDED Requirements

### Requirement: Invariant Guards SHALL Enforce Cluster Production Wiring
Synthesis invariant guards SHALL enforce cluster dedupe production wiring and
lightweight path isolation.

#### Scenario: Static guard scans active sources
- **WHEN** invariant tests inspect Synthesis active sources
- **THEN** `runAdvancedReferenceMatchingNow` SHALL call
  `dedupeCanonicalReferencesClustered`
- **AND** refresh/apply paths SHALL NOT call it
- **AND** active source SHALL NOT expose the old pairwise
  `dedupeCanonicalReferences` symbol.
