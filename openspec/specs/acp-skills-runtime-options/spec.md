# acp-skills-runtime-options Specification

## Purpose
TBD - created by archiving change govern-acp-skills-runtime-options. Update Purpose after archive.
## Requirements
### Requirement: ACP Backend Connection Test

ACP Skills MUST require an ACP backend connection test to pass before workflow execution can use that backend.

#### Scenario: Untested Backend

Given an ACP backend has no passing connection test
When a workflow attempts to execute through ACP Skills
Then submission MUST fail with an actionable configuration error.

#### Scenario: Stale Backend

Given an ACP backend had passed connection test metadata
And the ACP launch configuration changes
When a workflow attempts to execute through ACP Skills
Then the backend MUST be treated as stale until the connection test is run again.

### Requirement: Runtime Option Cache

ACP connection tests MUST cache supported modes, models, and derived reasoning effort choices.

#### Scenario: Successful Probe

When an ACP backend probe succeeds
Then the backend MUST persist a passing connection test and runtime options cache.

### Requirement: Workflow Submission Options

ACP Skills workflow submission MUST expose cached mode, model, and reasoning options for selected ACP backends.

#### Scenario: Cached Options

Given a selected ACP backend has cached runtime options
When the workflow submit dialog is rendered
Then the dialog MUST show mode, model, and reasoning controls from the cache.

### Requirement: Frozen Run Runtime Options

ACP Skills runs MUST freeze selected runtime options at submission time.

#### Scenario: Run Starts

Given a workflow is submitted with ACP mode/model/reasoning options
When the ACP task session is created
Then the runner MUST apply the selected mode/model before sending the prompt
And the run snapshot MUST display the frozen choices.

