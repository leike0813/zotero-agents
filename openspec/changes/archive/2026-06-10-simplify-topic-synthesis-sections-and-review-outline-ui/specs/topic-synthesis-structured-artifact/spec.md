## MODIFIED Requirements

### Requirement: Topic synthesis structured artifact SHALL use consolidated sections

Complete topic synthesis artifacts SHALL avoid standalone sections that only
repeat a single neighboring concept.

#### Scenario: Improvement dimensions are consolidated

- **WHEN** a complete topic synthesis artifact is produced
- **THEN** `improvement_dimensions` SHALL be an object with `summary` and
  `dimensions`
- **AND** the manifest SHALL NOT contain an `improvement_dimension_summary`
  section.

#### Scenario: External literature is part of coverage

- **WHEN** a complete topic synthesis artifact is produced
- **THEN** external literature coverage SHALL be stored under
  `coverage.external_literature`
- **AND** the manifest SHALL NOT contain an `external_literature_analysis`
  section.
