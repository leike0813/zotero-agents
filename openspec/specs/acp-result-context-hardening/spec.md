# acp-result-context-hardening Specification

## Purpose
TBD - created by archiving change retire-acp-bundle-projection-and-review-hardening. Update Purpose after archive.
## Requirements
### Requirement: ACP skill runs shall not project bundles

ACP SkillRunner-compatible runs SHALL NOT create or return a projected SkillRunner bundle as their primary apply contract.

#### Scenario: Successful ACP skill run returns result context hints

Given an ACP SkillRunner-compatible run completes successfully
When the provider returns `ProviderExecutionResult`
Then `fetchType` SHALL be `result`
And `resultJson` SHALL be populated
And `responseJson.resultResolution` SHALL be `workflow-result-context`
And `responseJson.workspaceDir` and `responseJson.resultJsonPath` SHALL be available when known.

### Requirement: Migrated workflows shall apply through result context

Workflows migrated for ACP Skills SHALL read result JSON and artifact paths through `WorkflowResultContext`.

#### Scenario: ACP local artifact path is absolute

Given `resultJson` contains an absolute local artifact path
When the workflow calls `resultContext.readArtifactText()`
Then the artifact SHALL be read from the local path without requiring bundle content.

#### Scenario: ACP local artifact path is workspace-relative

Given `resultJson` contains a workspace-relative artifact path
When the workflow calls `resultContext.readArtifactText()`
Then the artifact SHALL be read relative to `responseJson.workspaceDir`.

### Requirement: Runtime cleanup shall not cross ACP scopes

Runtime cleanup SHALL distinguish ACP chat conversation data from ACP skill run data.

#### Scenario: Cleaning ACP conversations

When the user cleans ACP conversations
Then ACP chat state and rows SHALL be removed
And ACP skill run rows SHALL remain.

#### Scenario: Cleaning ACP skill runs

When the user cleans ACP skill runs
Then ACP skill run rows and run directories SHALL be removed
And ACP chat conversation rows SHALL remain.

