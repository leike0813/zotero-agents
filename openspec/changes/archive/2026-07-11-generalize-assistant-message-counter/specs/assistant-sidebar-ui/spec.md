## ADDED Requirements

### Requirement: Assistant panels show a shared semantic message counter

ACP Chat, ACP Skills, and SkillRunner SHALL render one localized message-counter managed region between the banner and main transcript area in `live`, `boundary`, and `silent` display modes. The region SHALL show separate Assistant, Thought, and Tool values for the current user execution and selected-owner cumulative totals.

The counter SHALL remain after terminal state and SHALL NOT be represented as a transcript item, pagination item, or transcript loading node. When a legacy owner has no complete cumulative metadata, the region SHALL show current values without a cumulative denominator.

#### Scenario: complete owner shows three current and cumulative values

- **WHEN** a selected owner has complete message-count metadata
- **THEN** the counter shows localized Assistant, Thought, and Tool categories
- **AND** each category is displayed as current execution / owner cumulative.

#### Scenario: terminal count remains visible

- **WHEN** the selected execution becomes terminal
- **THEN** its final current and cumulative values remain visible
- **AND** a later user-originated execution resets only the current values.

#### Scenario: legacy owner avoids false totals

- **WHEN** the selected owner lacks complete cumulative metadata
- **THEN** the counter shows current values only
- **AND** it does not display zero or a reconstructed page total as the owner cumulative value.

#### Scenario: counter keeps one natural-height shell row

- **WHEN** an Assistant panel renders toolbar, banner, counter, and content
- **THEN** the counter occupies its own natural-height row
- **AND** the main or empty content slot retains the remaining flexible height.

## REMOVED Requirements

### Requirement: Silent progress is transcript-owned

**Reason**: The Assistant-only silent progress node is replaced by the shared three-category managed counter in every display mode.

**Migration**: Remove the transcript-tail progress renderer and project the owner message-count DTO into the shared `messageCounter` panel region.
