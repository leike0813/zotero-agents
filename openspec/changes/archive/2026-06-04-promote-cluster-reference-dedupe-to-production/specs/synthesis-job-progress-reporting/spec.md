## ADDED Requirements

### Requirement: Advanced Matching SHALL Report Cluster Dedupe Counters
Advanced Reference Matching progress SHALL report production cluster dedupe
counters during the external dedupe phase.

#### Scenario: Cluster external dedupe completes
- **WHEN** Advanced Reference Matching finishes external dedupe
- **THEN** diagnostics SHALL include canonical candidates, clusters, edges,
  redirect actions, review actions, weak records, excluded records, extension
  risk edges, and rejected proposals preserved.
