## ADDED Requirements

### Requirement: Topic Detail Exposes Review-Oriented Sections

Topic Detail SHALL expose six top-level tabs: Overview, Taxonomy, Claims,
Compare, External, and Coverage.

#### Scenario: Structured artifact contains review-oriented sections

- **GIVEN** a topic artifact has positioning, taxonomy, comparison matrix,
  debates, review outline, evidence map, claims, external literature analysis,
  coverage, and gaps
- **WHEN** Topic Detail renders
- **THEN** the user SHALL be able to inspect those structures through the six
  top-level tabs.

### Requirement: Evidence Explorer Supports Digest Inspection

Topic Detail SHALL render a right-side Evidence Explorer that opens the paper
digest modal through the existing digest resolver.

#### Scenario: User clicks a paper evidence row

- **WHEN** the user clicks a paper evidence row or timeline marker
- **THEN** the Workbench SHALL request `resolveTopicPaperDigest`
- **AND** the digest modal SHALL show the result or an unavailable state.
