## ADDED Requirements

### Requirement: Dialog descriptors SHALL separate workflow fields, Host options, and preview state

The settings-dialog model MUST expose typed descriptor data for workflow
parameters, provider selection, Host queue options, and execution-unit preview.
Host options MUST NOT be represented as workflow-declared business parameters,
and preview rows MUST be display DTOs rather than executable provider requests.

#### Scenario: Dialog model is constructed for a supported provider

- **WHEN** the submit dialog descriptor is created for ACP Skills or SkillRunner
- **THEN** it SHALL include a Host maximum-concurrency descriptor
- **AND** it SHALL keep that descriptor outside workflow parameter values
- **AND** it SHALL expose preview loading, success, empty, and failure states independently

#### Scenario: Preview DTO is rendered

- **WHEN** a legal execution-unit preview is available
- **THEN** each row SHALL contain only stable display identity and task-name text needed by the dialog
- **AND** it SHALL NOT expose provider credentials or full request payload data

### Requirement: Dialog validation SHALL normalize maximum concurrency consistently

The dialog model MUST share the settings domain's normalization contract for
maximum concurrency. It MUST distinguish absent input from invalid input and
MUST produce only unlimited or positive-integer runtime values.

#### Scenario: Valid values are normalized

- **WHEN** input is blank, `0`, or a positive integer
- **THEN** blank and `0` SHALL normalize to unlimited
- **AND** the positive integer SHALL normalize to that exact limit

#### Scenario: Invalid values cannot leave the dialog model

- **WHEN** input is negative, fractional, non-numeric, or outside the supported integer range
- **THEN** the model SHALL expose a validation error
- **AND** it SHALL NOT produce a confirmable submit snapshot

### Requirement: The submit dialog layout SHALL remain compact with a unit preview

When multiple legal units exist, the dialog MUST use a two-region layout with
the compact selection preview on the left and the existing workflow/provider
controls on the right. The Host maximum-concurrency control MUST appear below
the preview in the left region when that region is present, and the layout MUST
remain usable at the dialog's supported narrow width.

#### Scenario: Long task names are rendered

- **WHEN** a preview task name exceeds the available row width
- **THEN** the row SHALL truncate the visible label without increasing row height
- **AND** all legal units SHALL remain reachable through the list's scrolling behavior

#### Scenario: Preview region is absent

- **WHEN** zero or one legal execution unit exists
- **THEN** the dialog SHALL keep its compact single-region layout
- **AND** the Host maximum-concurrency control SHALL still be rendered with the settings controls

