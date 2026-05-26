## ADDED Requirements

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
