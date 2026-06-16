## MODIFIED Requirements

### Requirement: Reference sidecar replacement governs stale canonicals with bounded reads
Reference sidecar replacement SHALL reconcile stale canonical references without
performing repeated full-table scans per stale canonical.

#### Scenario: Old source references become stale
- **WHEN** a source reference artifact replacement produces stale canonical ids
- **THEN** the service SHALL request blocker state for the stale canonical id
  set in one repository operation
- **AND** the repository SHALL use scoped SQL filters for raw references,
  bindings, redirects, proposals, review items, and citation graph rows
- **AND** the governance result SHALL preserve the existing auto-stale,
  auto-redirect, review-proposal, and blocked outcomes.
