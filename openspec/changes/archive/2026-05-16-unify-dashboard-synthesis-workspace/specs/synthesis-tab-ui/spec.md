## ADDED Requirements

### Requirement: Synthesis Workbench exposes a dense topic workbench

The Synthesis Workbench SHALL provide Home, Topics, Graph, Index, and Reader
views inside a Zotero tab.

#### Scenario: User opens Synthesis Home

- **WHEN** the Synthesis snapshot is available
- **THEN** the Home view SHALL show library insight cards
- **AND** it SHALL show top topic cards using topic metrics supplied by the
  snapshot.

#### Scenario: User browses topics

- **WHEN** the user opens the Topics view
- **THEN** the view SHALL support list and grid presentation
- **AND** it SHALL support sorting by title, paper count, and update time.

#### Scenario: User opens Markdown reader

- **WHEN** the user opens a topic artifact
- **THEN** the Markdown reader SHALL replace the main view as an immersive page
- **AND** it SHALL preserve close/back, refresh, copy, and open-folder actions.

### Requirement: Synthesis topic summaries expose card metrics

Topic artifact rows SHALL include metrics required by the Home and Topics card
views.

#### Scenario: Snapshot normalizes a topic row

- **WHEN** a topic row contains paper count, summary, completion, and update time
- **THEN** the normalized snapshot SHALL preserve those fields
- **AND** filtered topic rows SHALL remain sorted according to the selected
  topic sort.
