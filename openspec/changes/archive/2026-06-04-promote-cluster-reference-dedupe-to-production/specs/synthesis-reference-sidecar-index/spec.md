## ADDED Requirements

### Requirement: Reference Sidecar Review Read Model SHALL Expose Cluster Evidence
Reference Sidecar Index and Review read models SHALL keep using existing
proposal/fact entities while carrying cluster evidence for canonical merge
review.

#### Scenario: Canonical merge proposal is shown
- **WHEN** a `canonical_merge` proposal came from production cluster dedupe
- **THEN** its evidence SHALL include readable source/target titles, cluster id,
  edge type, risk signals, and representative rationale where available.
