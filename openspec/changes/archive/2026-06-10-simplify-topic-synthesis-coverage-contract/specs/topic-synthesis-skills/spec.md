# topic-synthesis-skills Delta

## MODIFIED Requirements

### Requirement: Finalize coverage payload

Stage 60 coverage payload SHALL author the current coverage fields directly and
SHALL NOT include duplicated reliability or derived coverage summary fields.

#### Scenario: Stage 60 minimal current payload

- **WHEN** the finalize skill renders Stage 60 instructions and schema
- **THEN** the payload requires `coverage_verdict`, `coverage_reason`,
  `coverage_caveats`, `external_context_summary`, and
  `suggested_collection_directions`
- **AND** the payload does not include `reliability_summary`
- **AND** the instructions describe `external_context_summary` as the direct
  external coverage summary
