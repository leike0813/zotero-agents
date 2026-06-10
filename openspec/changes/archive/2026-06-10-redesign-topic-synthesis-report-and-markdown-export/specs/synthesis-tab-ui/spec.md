## MODIFIED Requirements

### Requirement: Topic details displays structured synthesis artifacts

Topic Details SHALL display the canonical report body directly and avoid the old
persisted Markdown export reader flow.

#### Scenario: User reads and exports the report

- **WHEN** Topic Details displays a topic with `synthesis_report.body`
- **THEN** the Report tab SHALL render that Markdown body
- **AND** it SHALL provide a Copy action that copies the body source
- **AND** it SHALL provide an Export action that prompts for a Host save path
  and writes the body as Markdown
- **AND** Topic Details SHALL NOT show Markdown export or Open folder toolbar
  actions.
