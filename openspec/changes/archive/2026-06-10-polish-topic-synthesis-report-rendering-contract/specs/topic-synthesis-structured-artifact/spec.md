## MODIFIED Requirements

### Requirement: Topic synthesis has a structured canonical artifact

Topic synthesis SHALL have a structured JSON artifact as its display and reuse
source of truth, while Markdown remains a compatibility export.

#### Scenario: Compatibility Markdown export is readable

- **WHEN** Host apply persists a create or update-full topic synthesis artifact
- **THEN** `current/export.md` SHALL be rendered from the structured artifact as
  readable Markdown headings and lists
- **AND** it SHALL include the canonical `synthesis_report.body`
- **AND** it SHALL NOT dump taxonomy, dimensions, or other structured sections
  as fenced JSON source blocks.
