## ADDED Requirements

### Requirement: CLI documents topic context views and file output

Host Bridge CLI Synthesis guidance SHALL document `topics get-context` as a
read-only command that supports explicit `digest`, `semantic`, `audit`, and
`full` views.

#### Scenario: Agent reads large topic context
- **WHEN** an agent needs a large topic context through `zotero-bridge topics get-context`
- **THEN** the guidance SHALL show using `view` to choose the payload boundary
- **AND** it SHALL show `outputPath` as the preferred way to avoid stdout
  truncation for large semantic or full views.
