# synthesize-topic-workflow

## ADDED Requirements

### Requirement: Topic synthesis skills declare required MCP tools

The create and update topic synthesis skill runner manifests SHALL declare the
Zotero MCP tools required before their first agent prompt.

#### Scenario: Required tools are declared

- **GIVEN** the create or update topic synthesis skill package
- **WHEN** its `assets/runner.json` is read
- **THEN** it SHALL contain `mcp.required_tools`
- **AND** the list SHALL include the synthesis tools required for the first host
  context and artifact export operations.

### Requirement: Topic synthesis does not use public artifact read MCP tool

The topic synthesis skill instructions SHALL use the host artifact export tool
as the primary Stage 4 path.

#### Scenario: Read tool is not documented as a public dependency

- **GIVEN** the create or update topic synthesis skill package
- **WHEN** the skill body and runner prompt are inspected
- **THEN** they SHALL NOT instruct the agent to call
  `synthesis.read_paper_artifacts`
- **AND** they SHALL instruct the agent to use
  `synthesis.export_paper_artifact_bundle`.
