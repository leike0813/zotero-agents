## MODIFIED Requirements

### Requirement: reference-matching workflow SHALL be deprecated

The active built-in workflow registry SHALL NOT load `reference-matching` as an executable workflow.

#### Scenario: Active workflow scan excludes reference-matching

- **WHEN** built-in workflows are scanned
- **THEN** no loaded workflow manifest SHALL have id `reference-matching`
- **AND** stale persisted settings for `reference-matching` SHALL be ignored unless a user explicitly installs a separate custom workflow with that id.
