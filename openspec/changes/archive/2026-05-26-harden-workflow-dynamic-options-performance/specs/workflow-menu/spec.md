## ADDED Requirements

### Requirement: Workflow Menu Avoids Heavy Dynamic Option Reads
The workflow menu SHALL build and preflight menu entries without resolving heavyweight dynamic workflow parameter options, including Synthesis topic options that require full Workbench snapshots.

#### Scenario: Opening workflow menu with Synthesis topic workflow
- **WHEN** the user opens the workflow toolbar menu and a visible workflow has `optionsSource.kind` equal to `synthesis.topics`
- **THEN** the menu MUST NOT call the full Synthesis Workbench snapshot path
- **AND** the menu MUST still render the workflow entry and ordinary disabled reason state.

#### Scenario: Triggering workflow still validates inputs
- **WHEN** the user executes a workflow from the menu
- **THEN** the normal workflow execution path MUST still resolve required execution context and validate workflow inputs before submitting the run.
