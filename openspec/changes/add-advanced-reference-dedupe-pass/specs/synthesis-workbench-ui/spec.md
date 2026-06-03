## MODIFIED Requirements

### Requirement: Review Center displays reference match proposals
Workbench Review Center SHALL display both Zotero binding and canonical merge proposals.

#### Scenario: Canonical merge proposal is rendered
- **WHEN** Workbench renders a `canonical_merge` proposal
- **THEN** it SHALL show readable source and target reference titles, confidence, score, and reasons
- **AND** it SHALL provide Accept and Reject actions.
