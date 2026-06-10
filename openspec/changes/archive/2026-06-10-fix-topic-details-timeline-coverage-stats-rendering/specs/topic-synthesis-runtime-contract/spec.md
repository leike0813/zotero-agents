## MODIFIED Requirements

### Requirement: Runtime materializes statistics and synthesis report

Runtime SHALL generate lightweight statistics needed by Topic Details from
runtime-owned artifacts.

#### Scenario: Source paper time span is materialized

- **WHEN** finalize writes the complete topic sections
- **THEN** `source_papers[].year` SHALL be populated when a year is available
  from the resolved workset or paper artifact metadata
- **AND** `statistics.time_span` SHALL contain the earliest and latest
  available source paper years.
