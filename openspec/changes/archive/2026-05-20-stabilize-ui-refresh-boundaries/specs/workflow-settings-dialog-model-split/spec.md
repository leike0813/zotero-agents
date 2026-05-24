# workflow-settings-dialog-model-split

## ADDED Requirements

### Requirement: Workflow settings refresh preserves active form controls

Workflow settings dialogs SHALL preserve active form-control state during
provider option, status, or render-model refreshes.

#### Scenario: Options refresh keeps edited field

- **WHEN** the user is editing a workflow settings field
- **AND** provider options or status refresh without changing the field schema
- **THEN** the active field DOM node and current draft value SHALL be preserved
- **AND** save, apply, cancel, validation, and serialization semantics SHALL
  remain unchanged.

#### Scenario: Custom select refresh keeps interaction state

- **WHEN** a custom select is open or has a selected option
- **AND** a compatible settings refresh arrives
- **THEN** the select interaction SHALL remain coherent
- **AND** selecting, closing, and serializing the control SHALL behave as before.
