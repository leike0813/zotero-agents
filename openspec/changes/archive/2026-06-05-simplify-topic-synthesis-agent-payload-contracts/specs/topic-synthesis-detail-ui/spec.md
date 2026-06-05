## ADDED Requirements

### Requirement: Topic Detail renders timeline from artifact markers

Topic Detail SHALL use `timeline_events.markers` as the primary timeline
rendering input for new topic synthesis artifacts.

#### Scenario: Markers are available

- **WHEN** a topic artifact contains `timeline_events.markers`
- **THEN** Topic Detail SHALL group markers by year and render paper/milestone
  pins from marker data
- **AND** it SHALL use paper evidence and event ids to resolve details.

#### Scenario: Markers are missing

- **WHEN** an older topic artifact lacks `timeline_events.markers`
- **THEN** Topic Detail SHALL fall back to the existing timeline marker
  derivation behavior.

### Requirement: Topic Detail renders improvement dimensions

Topic Detail SHALL prefer improvement dimension analysis over legacy comparison
matrix rendering.

#### Scenario: Improvement dimensions are available

- **WHEN** a topic artifact contains `improvement_dimensions[]`
- **THEN** Topic Detail SHALL render an Improvement / Dimensions view from
  those dimensions
- **AND** it SHALL not require a comparison matrix to show method progress.

#### Scenario: Only legacy comparison matrix is available

- **WHEN** an older topic artifact contains `comparison_matrix` but lacks
  `improvement_dimensions[]`
- **THEN** Topic Detail SHALL keep the legacy Compare fallback.
