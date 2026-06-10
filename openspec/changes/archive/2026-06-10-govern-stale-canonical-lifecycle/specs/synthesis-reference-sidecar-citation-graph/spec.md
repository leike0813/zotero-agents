## ADDED Requirements

### Requirement: Reference sidecar refresh SHALL reconcile stale canonical references

When a reference artifact refresh marks raw references stale for a source, the system SHALL reconcile affected canonicals after the new active raw references for that same source have been written.

#### Scenario: Safe stale canonical has a successor

- **WHEN** an old canonical loses all active raw references for a source
- **AND** the same source now has an active raw reference with a high-confidence successor canonical
- **AND** the old canonical has no binding, redirect, review proposal, or active citation graph participation
- **THEN** the system SHALL write an old-to-new canonical redirect
- **AND** mark the old canonical stale.

#### Scenario: Protected stale canonical needs review

- **WHEN** an old canonical loses active raw evidence
- **AND** it has a binding, redirect, review proposal, or active citation graph participation
- **THEN** the system SHALL NOT automatically modify the canonical
- **AND** SHALL create a Canonical Revision review proposal.

### Requirement: Stale canonical reconciliation SHALL stay source-scoped

Successor matching SHALL only compare against current active raw references from the same sourceRef that caused the stale transition.

#### Scenario: Similar canonical from another source is ignored

- **WHEN** a stale canonical from source A has no active raw references
- **AND** source B has a similar active raw reference
- **THEN** stale canonical reconciliation SHALL NOT use source B as the successor.
