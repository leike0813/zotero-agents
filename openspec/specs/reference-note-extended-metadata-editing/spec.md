# reference-note-extended-metadata-editing Specification

## Purpose
Extended reference metadata editing belonged to the deprecated built-in `reference-note-editor` workflow.

## Requirements

### Requirement: active built-ins SHALL NOT provide reference-note-editor metadata editing
The active built-in workflow package SHALL NOT expose reference metadata editing through `reference-note-editor`.

#### Scenario: Deprecated metadata editor is absent
- **WHEN** active built-in workflows are loaded
- **THEN** `reference-note-editor` SHALL NOT contribute editor sessions, save actions, or metadata field editing UI.
