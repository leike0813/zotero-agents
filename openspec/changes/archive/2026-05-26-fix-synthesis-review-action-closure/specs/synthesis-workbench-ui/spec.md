## ADDED Requirements

### Requirement: Workbench review actions close the visible review loop

Synthesis Workbench SHALL make review actions feel immediate while preserving
canonical service authority.

#### Scenario: Cleanup proposal is decided

- **WHEN** a Literature Cleanup proposal is approved, rejected, or skipped
- **THEN** the next Workbench snapshot SHALL read proposal status from canonical
  cleanup records
- **AND** the open cleanup review count SHALL no longer depend solely on stale
  registry projection data.

#### Scenario: Cleanup proposal is displayed

- **WHEN** a cleanup review card is shown
- **THEN** the card SHALL prioritize user-readable paper/reference/work titles
  and decision context
- **AND** implementation identifiers such as `proposal_id` SHALL NOT be primary
  card content.

#### Scenario: Topic graph relation is displayed

- **WHEN** a Topic Graph edge or relation proposal requires review
- **THEN** the card title SHALL include readable source topic, relation, and
  target topic text
- **AND** the card SHALL show confidence, evidence/provenance, diagnostics, or
  reason details sufficient for a decision
- **AND** edge/review ids SHALL NOT be primary card content.

#### Scenario: Review action is submitted

- **WHEN** the user clicks a review decision button
- **THEN** the current card SHALL advance optimistically to the next local open
  item without waiting for the backend command to finish
- **AND** duplicate scoped submissions SHALL remain single-flight
- **AND** if the backend command fails, the hidden item SHALL reappear and the
  failure SHALL be surfaced through the existing action status UI.

#### Scenario: Background snapshot arrives

- **WHEN** a background snapshot does not require a user-visible page reset
- **THEN** the Workbench SHALL preserve main content scroll position
- **AND** status/action updates SHALL NOT force the user back to the top of the
  current tab.
