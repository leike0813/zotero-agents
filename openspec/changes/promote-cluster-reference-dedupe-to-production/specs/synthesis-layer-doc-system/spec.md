## ADDED Requirements

### Requirement: Active Docs SHALL Treat Cluster Dedupe As Production Policy
Active Synthesis docs SHALL describe cluster-first external dedupe as the
production Advanced Reference Matching policy.

#### Scenario: Developer reads active reference-resolution docs
- **WHEN** docs describe Advanced External Dedupe
- **THEN** they SHALL state that production `runAdvancedReferenceMatchingNow`
  uses cluster-first dedupe
- **AND** they SHALL NOT describe production as wired to the old pairwise
  dedupe algorithm.
