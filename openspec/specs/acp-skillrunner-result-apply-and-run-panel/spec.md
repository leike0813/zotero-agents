# acp-skillrunner-result-apply-and-run-panel Specification

## Purpose
TBD - created by archiving change fix-acp-skillrunner-result-apply-and-run-panel. Update Purpose after archive.
## Requirements
### Requirement: ACP SkillRunner-compatible result context

ACP SkillRunner-compatible provider results SHALL expose validated result JSON and local path hints for `WorkflowResultContext`.

#### Scenario: Literature digest artifacts are resolved through result context

Given an ACP skill run produced a valid `result/result.json`
And the result references digest, references, and citation analysis artifacts
When the provider returns a successful result
Then `fetchType` SHALL be `result`
And `responseJson.resultResolution` SHALL be `workflow-result-context`
And the workflow SHALL read referenced artifacts through `WorkflowResultContext`.

### Requirement: ACP skill run conversation panel

ACP skill run UI SHALL present the selected run as an agent run transcript panel with a task drawer for switching runs.

#### Scenario: ACP session updates become run transcript

Given an ACP SkillRunner-compatible run receives ACP session updates
When agent message, thought, tool call, plan, or usage updates arrive
Then the run store SHALL persist them as run-local transcript state
And it SHALL NOT write them into the normal ACP chat conversation store.

#### Scenario: Details are secondary

Given an ACP skill run is selected
When the panel is rendered
Then the main surface SHALL show the run transcript, plan panel, permission state, running state, and final state
And workspace, skill roots, validation, logs, and result JSON SHALL be shown only in a secondary details drawer.

### Requirement: ACP backend workflow task management

ACP backend dashboard tabs SHALL render `skillrunner.job.v1` workflow runs as task-management rows, not as generic HTTP log-inspection views.

#### Scenario: ACP backend tab opens a workflow run

Given an ACP backend has `skillrunner.job.v1` runs
When the dashboard backend tab is rendered
Then the tab SHALL show task-management rows with workflow, task, status, requestId, update time, and actions
And opening a row SHALL route to the ACP skill run panel for that requestId.

