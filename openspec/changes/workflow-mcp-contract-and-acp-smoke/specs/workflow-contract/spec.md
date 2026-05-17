# workflow-contract

## ADDED Requirements

### Requirement: Workflows declare supported backend types

Workflow implementations SHALL support `execution.supportedBackends` as an
optional backend type declaration. Backend listing and resolution SHALL only
return compatible backend types when the declaration is present.

#### Scenario: ACP-only workflow excludes SkillRunner

- **GIVEN** a workflow declares `execution.supportedBackends: ["acp"]`
- **WHEN** backends are listed or resolved for the workflow
- **THEN** SkillRunner backends SHALL NOT be considered compatible
- **AND** selecting a SkillRunner backend SHALL fail with an incompatible
  backend error.

### Requirement: Workflows declare required MCP tools

Workflow implementations SHALL support `execution.mcp.requiredTools` as an
optional Zotero MCP tool declaration. These declarations SHALL be carried into
ACP skill run requests for orchestration.

#### Scenario: Required MCP tools are exposed to ACP orchestration

- **GIVEN** a workflow declares `execution.mcp.requiredTools`
- **WHEN** the workflow request is compiled for an ACP skill run
- **THEN** the ACP request SHALL include the required tool names in runtime
  options for the ACP orchestrator.
