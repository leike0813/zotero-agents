## ADDED Requirements

### Requirement: Index separates facts from matching proposals
The Reference Sidecar Index SHALL display accepted binding facts separately from advanced matcher proposals.

#### Scenario: Referenced-only rows are listed
- **WHEN** Index renders active referenced rows
- **THEN** binding status SHALL be derived from accepted facts and current Zotero target availability
- **AND** open proposals SHALL NOT make the row appear accepted.

#### Scenario: Proposal summary is available
- **WHEN** a referenced row has open advanced matching proposals
- **THEN** Index MAY show an open-proposal indicator
- **AND** detailed proposal actions SHALL live in the Advanced Matching review subview.

