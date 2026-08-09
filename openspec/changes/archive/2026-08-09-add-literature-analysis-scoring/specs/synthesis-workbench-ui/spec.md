## ADDED Requirements

### Requirement: Synthesis Index SHALL display literature ratings

The Synthesis Index SHALL project and render literature ratings for parent
paper rows without exposing the internal score-only parameter.

#### Scenario: Parent paper has a valid score

- **WHEN** an Index parent row is rendered
- **THEN** it SHALL display the same five-star rating as the Zotero library
- **AND** an expanded reference child row SHALL preserve table alignment with an
  empty rating cell.

#### Scenario: Legacy triplet needs a score

- **WHEN** the parent row's literature-analysis mode is `score-only`
- **THEN** the Analyze action SHALL remain enabled
- **AND** the UI SHALL NOT expose a score-only option.

#### Scenario: All four outputs exist

- **WHEN** the parent row's mode is `unavailable`
- **THEN** the Analyze action SHALL be disabled.
