## ADDED Requirements

### Requirement: Workflow settings SHALL exclude deprecated built-in reference note workflows

The workflow settings UI SHALL not expose settings pages for deprecated built-in reference note workflows.

#### Scenario: Deprecated settings are not active

- **WHEN** active built-in workflow settings descriptors are generated
- **THEN** no descriptor SHALL be generated for built-in workflow id `reference-matching`
- **AND** no descriptor SHALL be generated for built-in workflow id `reference-note-editor`
- **AND** stale persisted settings for those ids SHALL NOT create synthetic active descriptors.
