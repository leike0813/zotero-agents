# topic-synthesis-structured-artifact Delta

## MODIFIED Requirements

### Requirement: Complete topic artifact sections

The complete topic synthesis artifact SHALL include a `future_directions`
section and SHALL NOT include a `gaps` section.

#### Scenario: Complete manifest uses current section names

- **WHEN** split finalize materializes a complete topic artifact
- **THEN** the manifest sections include `future_directions`
- **AND** the manifest sections do not include `gaps`

### Requirement: Summary section shape

The summary section SHALL avoid duplicated synonymous fields.

#### Scenario: Summary has no long summary clone

- **WHEN** split finalize materializes `result/sections/summary.json`
- **THEN** the summary object contains `brief`, `summary`, and
  `key_takeaways`
- **AND** it does not contain `long_summary`

### Requirement: Future directions source refs

Future directions SHALL use `source_paper_refs` to reference source papers.

#### Scenario: Future direction refs are valid

- **WHEN** a complete artifact is validated
- **THEN** each `future_directions[]` row with `source_paper_refs` references
  existing `source_papers[].paper_ref`

### Requirement: Coverage caveats are coverage-owned

Coverage caveats SHALL remain inside `coverage.coverage_caveats`.

#### Scenario: Coverage caveats are not copied into future directions

- **WHEN** Stage 60 submits coverage caveats
- **THEN** they remain in the coverage section
- **AND** runtime does not copy them into `future_directions`
