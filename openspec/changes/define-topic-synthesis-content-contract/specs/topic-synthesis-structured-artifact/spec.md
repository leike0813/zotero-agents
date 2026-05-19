## MODIFIED Requirements

### Requirement: Topic synthesis artifacts SHALL expose a complete structured content contract

The system SHALL require a topic synthesis artifact to contain the existing
core sections plus `statistics` and `synthesis_report`.

#### Scenario: Empty-shell sections are rejected

- **WHEN** a topic artifact omits discipline/field/scope metadata, research
  route analysis, timeline progression details, external literature coverage
  judgment, statistics, or report prose
- **THEN** validation SHALL reject the artifact before apply succeeds.

### Requirement: Topic synthesis content SHALL support both Workbench reading and review writing

The content contract SHALL require route analysis, timeline progression,
argued findings, external literature analysis, coverage/statistics, and a
continuous report suitable for downstream literature writing workflows.

#### Scenario: External literature is analyzed separately from primary evidence

- **WHEN** external references are present
- **THEN** they SHALL be analyzed in `external_literature_analysis`
- **AND** they SHALL NOT become primary claim or timeline evidence.
