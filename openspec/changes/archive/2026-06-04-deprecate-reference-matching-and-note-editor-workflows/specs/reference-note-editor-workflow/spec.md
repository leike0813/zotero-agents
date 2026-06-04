## MODIFIED Requirements

### Requirement: reference-note-editor workflow SHALL be deprecated

The active built-in workflow registry SHALL NOT load `reference-note-editor` as an executable workflow.

#### Scenario: Active workflow scan excludes reference-note-editor

- **WHEN** built-in workflows are scanned
- **THEN** no loaded workflow manifest SHALL have id `reference-note-editor`
- **AND** stale persisted settings for `reference-note-editor` SHALL be ignored unless a user explicitly installs a separate custom workflow with that id.
