## MODIFIED Requirements

### Requirement: Topic synthesis has a structured canonical artifact

Topic synthesis SHALL use its structured JSON artifact and
`synthesis_report.body` as the persisted display and report source of truth.

#### Scenario: Host apply persists structured current files without markdown export

- **WHEN** Host apply persists a create or update-full topic synthesis artifact
- **THEN** the current topic directory SHALL contain current manifest, metadata,
  artifact, and section JSON files
- **AND** it SHALL NOT write `current/export.md`
- **AND** current metadata SHALL NOT include markdown/export hashes
- **AND** the persisted artifact SHALL include `synthesis_report.body` as the
  report Markdown source.
