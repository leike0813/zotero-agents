## MODIFIED Requirements

### Requirement: Split finalize materializes complete topic synthesis output

The split topic synthesis finalize runtime SHALL render
`result/sections/synthesis_report.json.body` as the canonical Markdown report
from the complete structured section set.

#### Scenario: Finalize renders the canonical report body

- **WHEN** finalize completes a create or update-full topic synthesis run
- **THEN** `result/sections/synthesis_report.json` SHALL contain a `body` string
  rendered from topic, taxonomy, timeline, claims, improvement dimensions,
  debates, future directions, review outline, coverage, summary, and
  source_papers sections
- **AND** source paper references in the body SHALL use stable bibliography
  numbers derived from `source_papers[]`
- **AND** source paper references before the bibliography SHALL be Markdown
  links to bibliography anchors
- **AND** each bibliography item SHALL define a stable `ref-n` anchor before its
  plain bracketed number
- **AND** the body SHALL NOT be a JSON envelope or runtime diagnostic text.
