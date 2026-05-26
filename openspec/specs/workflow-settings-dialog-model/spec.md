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

