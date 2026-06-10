## MODIFIED Requirements

### Requirement: Split skill instructions are current-state only

Generated topic synthesis split skill instructions MUST describe the current
`source_paper_refs` workflow without historical migration wording.

#### Scenario: Core instructions name current reference field

- **WHEN** the split skill suite is rendered
- **THEN** the core enrichment skill explains that topic-level sections use
  `source_paper_refs`
- **AND** generated skill docs do not document historical evidence fields

### Requirement: Split finalize runtime materializes source papers

The split finalize runtime MUST materialize source paper metadata and preserve
topic-section `source_paper_refs`.

#### Scenario: Multiple source refs remain distinct

- **WHEN** a core synthesis payload references different papers from different
  topic-level rows
- **THEN** the final sections keep those distinct `source_paper_refs`
- **AND** final output includes `result/sections/source-papers.json`
