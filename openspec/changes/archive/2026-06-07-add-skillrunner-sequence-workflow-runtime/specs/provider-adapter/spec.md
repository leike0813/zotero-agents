## ADDED Requirements

### Requirement: ACP executes sequence steps with workflow workspace intent

The ACP execution path SHALL support workflow workspace intent for skill runs
launched by `skillrunner.sequence.v1`.

#### Scenario: First step creates workflow workspace

- **WHEN** a sequence step is launched with
  `runtime_options.workflow_workspace.mode = "new"`
- **THEN** ACP SHALL create a run workspace and register it for the supplied
  `workflow_run_id`.

#### Scenario: Downstream step reuses workflow workspace

- **WHEN** a sequence step is launched with
  `runtime_options.workflow_workspace.mode = "reuse"`
- **THEN** ACP SHALL create a new request id and skill run record
- **AND** it SHALL use the workspace registered for that `workflow_run_id`.

#### Scenario: Reuse target is invalid

- **WHEN** a sequence step requests workspace reuse
- **AND** no reusable workspace is registered for the `workflow_run_id`
- **THEN** ACP SHALL fail the step closed instead of creating an unrelated
  workspace.
