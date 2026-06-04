## ADDED Requirements

### Requirement: Workflow menu SHALL exclude deprecated built-in reference note workflows

The workflow menu SHALL be built from active loaded workflow manifests only.

#### Scenario: Deprecated workflows are not menu actions

- **WHEN** the active built-in registry is used to render workflow actions
- **THEN** no menu action SHALL be rendered for built-in workflow id `reference-matching`
- **AND** no menu action SHALL be rendered for built-in workflow id `reference-note-editor`.
