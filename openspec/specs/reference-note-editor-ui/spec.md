# reference-note-editor-ui Specification

## Purpose
The built-in Reference Note Editor UI is deprecated with the `reference-note-editor` workflow.

## Requirements

### Requirement: deprecated reference note editor UI SHALL NOT be exposed by active built-ins
The active built-in workflow menu and settings UI SHALL NOT expose the deprecated `reference-note-editor` workflow.

#### Scenario: Workflow menu excludes deprecated editor
- **WHEN** active built-in workflows are used to build the workflow menu
- **THEN** no menu action SHALL be created for built-in workflow id `reference-note-editor`.
