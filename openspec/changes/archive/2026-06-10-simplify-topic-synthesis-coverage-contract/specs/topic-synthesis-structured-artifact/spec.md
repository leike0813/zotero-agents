# topic-synthesis-structured-artifact Delta

## MODIFIED Requirements

### Requirement: Coverage section

The topic synthesis artifact SHALL store coverage as a minimal section without
runtime-generated duplicate summary fields.

#### Scenario: Apply-ready coverage artifact

- **WHEN** split finalize materializes `result/sections/coverage.json`
- **THEN** the section contains `coverage_verdict`, `coverage_reason`,
  `coverage_caveats`, `external_context_summary`, and
  `suggested_collection_directions`
- **AND** the section does not contain `route_coverage_summary`,
  `claim_coverage_summary`, `timeline_coverage_summary`,
  `reliability_summary`, or `external_literature`
- **AND** artifact validation accepts the minimal coverage section as complete
