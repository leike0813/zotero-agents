## MODIFIED Requirements

### Requirement: Synthesis Index displays four artifact states and separate rating

The Index SHALL display one availability icon for each paper artifact and a separate numeric-score-derived Rating column.

#### Scenario: Four artifacts are available
- **WHEN** digest, references, citation analysis, and literature score are available
- **THEN** the artifact cell SHALL show four available icons
- **AND** Analyze SHALL be disabled.

#### Scenario: Only score is unavailable
- **WHEN** the three analysis artifacts are available and literature score is missing or invalid
- **THEN** Analyze SHALL execute literature-analysis score-only mode without exposing that mode as a user option.

#### Scenario: Analysis artifact is unavailable
- **WHEN** any digest, references, or citation-analysis artifact is unavailable
- **THEN** Analyze SHALL execute full analysis.
