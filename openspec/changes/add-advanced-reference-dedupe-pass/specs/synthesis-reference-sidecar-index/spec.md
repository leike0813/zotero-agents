## MODIFIED Requirements

### Requirement: Reference Sidecar Index exposes reviewable merge evidence
The Index and referenced-only read model SHALL expose enough readable evidence for canonical merge review.

#### Scenario: Canonical merge proposal is shown
- **WHEN** a `canonical_merge` proposal appears in the read model
- **THEN** it SHALL include readable source and target titles when available
- **AND** it SHALL include matcher reasons, score, raw reference ids, and diagnostic evidence.
