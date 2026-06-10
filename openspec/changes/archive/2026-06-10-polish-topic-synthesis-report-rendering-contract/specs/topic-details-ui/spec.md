## MODIFIED Requirements

### Requirement: Topic details present synthesis reports as reader content

The Topic Details Report tab SHALL present the report body as user-facing
Markdown content rather than exposing the underlying section JSON envelope.

#### Scenario: Report section is displayed

- **WHEN** a topic detail DTO contains `synthesis_report.body`
- **THEN** the Report tab SHALL render that body as Markdown
- **AND** it SHALL NOT display internal section mapping fields such as
  `source_section_chapters` as normal user content.
