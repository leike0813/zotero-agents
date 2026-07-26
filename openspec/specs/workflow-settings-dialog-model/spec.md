# workflow-settings-dialog-model Specification

## Purpose
TBD - created by archiving change add-workflow-dynamic-parameter-options. Update Purpose after archive.
## Requirements
### Requirement: Workflow settings descriptors expose dynamic options

The workflow settings descriptor SHALL resolve supported parameter option
sources before rendering.

#### Scenario: Collection options resolve

- **WHEN** a workflow parameter declares `zotero.collections`
- **THEN** the descriptor entry SHALL include option DTOs
- **AND** the UI SHALL display option labels while storing submitted values.

#### Scenario: Collection options fail to resolve

- **WHEN** the host cannot resolve a dynamic option source
- **THEN** the descriptor SHALL remain renderable
- **AND** the parameter SHALL fall back to text input behavior.

### Requirement: Workflow Settings Descriptor Supports Lightweight Dynamic Options
The workflow settings descriptor builder SHALL allow callers to skip dynamic option resolution when they only need summary, configurability, or blocked-state metadata.

#### Scenario: Dashboard summary builds lightweight descriptors
- **WHEN** the dashboard builds workflow summaries or quick-run availability state
- **THEN** descriptor construction MUST be able to omit dynamic option values
- **AND** it MUST NOT call expensive option sources such as full Synthesis Workbench snapshots.

#### Scenario: Settings form keeps dynamic options
- **WHEN** the UI renders an editable workflow settings form
- **THEN** descriptor construction MUST resolve dynamic options by default
- **AND** option diagnostics MUST remain visible to the user.

### Requirement: Workflow settings SHALL exclude deprecated built-in reference note workflows

The workflow settings UI SHALL not expose settings pages for deprecated built-in reference note workflows.

#### Scenario: Deprecated settings are not active

- **WHEN** active built-in workflow settings descriptors are generated
- **THEN** no descriptor SHALL be generated for built-in workflow id `reference-matching`
- **AND** no descriptor SHALL be generated for built-in workflow id `reference-note-editor`
- **AND** stale persisted settings for those ids SHALL NOT create synthetic active descriptors.

### Requirement: Workflow settings descriptors SHALL expose localized workflow display copy

Workflow settings descriptors SHALL use the active display locale for workflow-owned fixed UI strings while preserving raw workflow ids and parameter keys.

#### Scenario: Parameter titles are localized

- **WHEN** a workflow parameter has a localized title or description for the active locale
- **THEN** the workflow settings descriptor entry SHALL expose the localized title or description
- **AND** submitted settings SHALL continue using the original parameter key.

#### Scenario: Missing parameter localization falls back

- **WHEN** a workflow parameter has no matching localized title or description
- **THEN** the descriptor SHALL fall back to the raw manifest title or description.

### Requirement: Workflow settings expose required parameters

Workflow settings descriptors and rendered forms SHALL preserve workflow parameter required metadata.

#### Scenario: Required field is rendered

- **WHEN** a parameter declares `required: true`
- **THEN** settings surfaces SHALL identify the field as required
- **AND** missing values SHALL not be submitted for workflow execution.

#### Scenario: Host Bridge describes workflow requirements

- **WHEN** workflow describe or requirements returns the parameter schema
- **THEN** each required parameter SHALL retain `required: true` in the returned descriptor.

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
the preview in the left region. The preview and maximum-concurrency control form
one multi-unit region: they MUST appear together or remain hidden together. The
layout MUST remain usable at the dialog's supported narrow width.

#### Scenario: Long task names are rendered

- **WHEN** a preview task name exceeds the available row width
- **THEN** the row SHALL truncate the visible label without increasing row height
- **AND** all legal units SHALL remain reachable through the list's scrolling behavior

#### Scenario: Maximum concurrency is rendered in the left region

- **WHEN** the multi-unit region renders the maximum-concurrency field below the preview
- **THEN** its label, input, and validation feedback SHALL remain contained by the left region
- **AND** the control SHALL NOT cross the boundary into the workflow/provider options region

#### Scenario: Three visual columns render side by side

- **WHEN** the multi-unit dialog is wide enough to render the execution-unit, workflow/run-option, and provider/backend-option columns side by side
- **THEN** all three column backgrounds SHALL extend to the height of the tallest column
- **AND** the execution-unit and workflow-option cards SHALL absorb available vertical space while maximum-concurrency and run-option cards remain compact

#### Scenario: Responsive layout collapses to one column

- **WHEN** the dialog reaches its supported single-column breakpoint
- **THEN** every card SHALL return to its natural content height
- **AND** equal-height stretching SHALL NOT introduce empty vertical gaps between stacked regions

#### Scenario: Preview region is absent

- **WHEN** zero or one legal execution unit exists
- **THEN** the dialog SHALL keep its compact single-region layout
- **AND** the Host maximum-concurrency control SHALL remain hidden

### Requirement: Workflow settings preview SHALL represent prepared units
The settings dialog preview SHALL render one row per top-level prepared unit using safe unit labels and member counts rather than raw candidate or selection payloads.

#### Scenario: Parent grouping preview
- **WHEN** candidate planning produces three parent groups
- **THEN** the preview displays three unit rows in prepared order

### Requirement: Concurrency controls SHALL depend on unit count
The left unit list and maximum-concurrency control SHALL be shown only when the confirmed preview contains more than one top-level unit.

#### Scenario: All grouping has many members
- **WHEN** all grouping produces one unit containing multiple members
- **THEN** the dialog hides the multi-unit list and concurrency control

