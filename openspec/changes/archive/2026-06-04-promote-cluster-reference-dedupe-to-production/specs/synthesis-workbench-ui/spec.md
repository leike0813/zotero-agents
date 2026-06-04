## ADDED Requirements

### Requirement: Workbench Review SHALL Render Cluster Canonical Merge Evidence
Workbench review surfaces SHALL continue to use the current proposal model and
SHALL display cluster evidence for canonical merge proposals.

#### Scenario: User reviews canonical merge
- **WHEN** Workbench renders a cluster-derived `canonical_merge` proposal
- **THEN** it SHALL prioritize readable source/target titles and edge/risk
  evidence over internal canonical ids.
