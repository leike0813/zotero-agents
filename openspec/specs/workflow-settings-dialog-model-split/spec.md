# workflow-settings-dialog-model-split Specification

## Purpose
TBD - created by archiving change split-workflow-settings-dialog-model. Update Purpose after archive.
## Requirements
### Requirement: Workflow settings dialog SHALL consume a dedicated render model
Workflow settings dialog UI rendering MUST be driven by an explicit render model, not by inline schema/data assembly in the dialog host.

#### Scenario: Dialog open initializes view model
- **WHEN** the workflow settings dialog is opened
- **THEN** section/field/action descriptors are produced by render-model builders
- **AND** dialog host renders from those descriptors without duplicating schema interpretation logic

### Requirement: Render-model composition SHALL be deterministic and side-effect free
Render-model builders MUST be pure and deterministic for the same manifest + settings inputs.

#### Scenario: Same inputs produce equivalent model
- **WHEN** the same workflow manifest and initial settings snapshots are provided
- **THEN** the produced render model is equivalent across runs
- **AND** no persistence/write side effects occur during composition

### Requirement: Draft serialization SHALL be centralized before domain apply/save
User-edited values in dialog controls MUST be collected and serialized through a single model-aware path before invoking settings domain APIs.

#### Scenario: Save and run-once apply
- **WHEN** user clicks save or apply in workflow settings dialog
- **THEN** dialog inputs are serialized through the centralized serializer
- **AND** settings domain receives structured payloads without duplicated dialog-layer normalization branches

### Requirement: Dialog refactor SHALL preserve behavior parity
The model/render split MUST NOT change existing workflow settings behavior.

#### Scenario: Existing settings interaction flow
- **WHEN** users perform open/edit/save/apply actions
- **THEN** run-once default reset, persistent save semantics, and execution settings behavior remain unchanged
- **AND** user-visible messaging and interaction flow stay equivalent

### Requirement: Workflow settings dialog SHALL render enum recommendations with editable input when allowCustom is enabled
For enum-backed string parameters with `allowCustom=true`, dialog rendering MUST provide both recommendation selection and free-text editing in one coherent control group.

#### Scenario: Selection from recommendation list
- **WHEN** user picks an option from the enum recommendation dropdown
- **THEN** dialog SHALL sync that value into the editable input
- **AND** serialized draft SHALL contain the selected value

#### Scenario: Manual custom value overrides recommendation
- **WHEN** user types a custom string into the editable input for the same field
- **THEN** dialog SHALL keep the custom value even if it is outside enum
- **AND** serialized draft SHALL use the editable input value as the final payload

#### Scenario: Strict enum fields keep existing select-only rendering
- **WHEN** parameter defines enum but `allowCustom` is missing or false
- **THEN** dialog SHALL keep existing dropdown-only behavior
- **AND** no editable companion input SHALL be rendered

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

