## MODIFIED Requirements

### Requirement: Synthesis debug diagnostics inspect queue, jobs, papers, topics, and DB/cache drift

The Host Bridge SHALL provide debug-only Synthesis diagnostics that read the
Synthesis service/repository APIs rather than directly stitching SQL in Host
Bridge handlers.

#### Scenario: Synthesis jobs are listed

- **WHEN** `debug.synthesis.jobs.list` is called with optional status, source,
  include-completed, or limit filters
- **THEN** the result SHALL return Workbench-compatible background job rows
  bounded by the effective limit
- **AND** dirty-event fallback rows SHALL be visible even when there is no raw
  durable job progress row
- **AND** raw durable progress rows SHALL be included only when
  `includeRawRows: true` is requested.
