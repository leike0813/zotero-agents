## ADDED Requirements

### Requirement: Public maintenance operations SHALL expose typed terminal receipts
Reference-sidecar and citation-graph maintenance receipts SHALL report normalized scope, operation state, actual state change, counts, diagnostics, retryability, and safe next actions.

#### Scenario: Sidecar batch partially succeeds
- **WHEN** at least one paper commits and at least one paper fails
- **THEN** operation lifecycle may be completed with outcome `partial`
- **AND** the receipt identifies successful and failed paper refs without claiming a full rollback.

#### Scenario: Graph update fails
- **WHEN** graph update fails before atomic commit
- **THEN** the previous graph remains readable
- **AND** the receipt reports failed with no graph state change.
