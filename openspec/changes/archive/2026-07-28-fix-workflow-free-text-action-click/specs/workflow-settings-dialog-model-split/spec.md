## MODIFIED Requirements

### Requirement: Workflow settings refresh preserves active form controls

Workflow settings dialogs SHALL preserve active form-control state during
provider option, status, or render-model refreshes. A draft update committed by
an editable text control SHALL synchronize its value without causing a
structural form refresh solely because that value is a dynamic provider option.

#### Scenario: Options refresh keeps edited field

- **WHEN** the user is editing a workflow settings field
- **AND** provider options or status refresh without changing the field schema
- **THEN** the active field DOM node and current draft value SHALL be preserved
- **AND** save, apply, cancel, validation, and serialization semantics SHALL
  remain unchanged.

#### Scenario: First action after editable text commit is delivered

- **WHEN** a user changes a free-text, numeric, or array workflow settings
  control
- **AND** the control commits because the user clicks a dialog or Dashboard
  action
- **THEN** the text-originated draft update SHALL NOT rebuild the current form
  before that action is delivered
- **AND** the action SHALL observe the committed draft value.

#### Scenario: Choice-driven structural refresh remains available

- **WHEN** a user selects a backend profile or a recommendation that changes
  dependent provider options
- **THEN** the settings UI SHALL retain its structural refresh behavior
- **AND** the refreshed controls SHALL reflect the selected choice.

#### Scenario: Custom select refresh keeps interaction state

- **WHEN** a custom select is open or has a selected option
- **AND** a compatible settings refresh arrives
- **THEN** the select interaction SHALL remain coherent
- **AND** selecting, closing, and serializing the control SHALL behave as before.
