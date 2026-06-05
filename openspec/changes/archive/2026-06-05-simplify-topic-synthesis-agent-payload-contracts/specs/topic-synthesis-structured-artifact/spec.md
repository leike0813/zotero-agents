## ADDED Requirements

### Requirement: Timeline events expose runtime-derived markers

The structured topic artifact SHALL expose `timeline_events.markers` as the
primary timeline rendering input for new artifacts.

#### Scenario: Timeline markers are present

- **WHEN** a new complete topic synthesis artifact contains `timeline_events`
- **THEN** it SHALL include `timeline_events.markers`
- **AND** each marker SHALL identify a paper evidence id and year when
  available
- **AND** marker type, event id, and deduplication SHALL be runtime-derived.

#### Scenario: Agent-authored timeline events are milestones

- **WHEN** an agent authors timeline events in the core synthesis payload
- **THEN** those events SHALL be treated as milestone candidates
- **AND** the agent-facing payload SHALL NOT expose `marker_kind`.

### Requirement: Improvement dimensions replace comparison matrix authoring

The structured artifact SHALL support improvement dimension analysis as the
preferred representation for method progress and tradeoffs.

#### Scenario: Improvement dimensions are materialized

- **WHEN** core synthesis provides `improvement_dimensions[]`
- **THEN** the final artifact SHALL preserve those dimensions as structured
  content
- **AND** runtime MAY derive a compatibility `comparison_matrix` only when
  needed for legacy consumers.

#### Scenario: New artifact omits comparison matrix

- **WHEN** a new artifact uses improvement dimensions
- **THEN** validation SHALL NOT require an agent-authored `comparison_matrix`.

### Requirement: Statistics and report are runtime materialized

The structured artifact SHALL treat statistics and synthesis report as
runtime-materialized sections.

#### Scenario: Statistics are materialized

- **WHEN** final materialization runs
- **THEN** `statistics.graph_statistics` SHALL be derived from graph/canonical
  data or marked with a structured stale/missing caveat
- **AND** the agent SHALL NOT be the source of numeric graph statistics.

#### Scenario: Synthesis report is materialized

- **WHEN** final materialization runs
- **THEN** `synthesis_report` SHALL be rendered from a fixed template and
  validated section sources
- **AND** the agent SHALL NOT author the final report body directly.
