# synthesize-topic-workflow

## ADDED Requirements

### Requirement: Topic synthesis workflows declare ACP-only required MCP contract

The create and update topic synthesis workflows SHALL declare that they only
support ACP backends and SHALL declare the Zotero Synthesis MCP tools required
for their workflow.

#### Scenario: Create workflow declares required MCP tools

- **WHEN** `create-topic-synthesis` workflow manifest is loaded
- **THEN** `execution.supportedBackends` SHALL equal `["acp"]`
- **AND** `execution.mcp.requiredTools` SHALL include
  `synthesis.list_topics`, `synthesis.get_library_index`,
  `synthesis.resolve_resolver`, and `synthesis.export_paper_artifact_bundle`.

#### Scenario: Update workflow declares required MCP tools

- **WHEN** `update-topic-synthesis` workflow manifest is loaded
- **THEN** `execution.supportedBackends` SHALL equal `["acp"]`
- **AND** `execution.mcp.requiredTools` SHALL include
  `synthesis.get_topic_context`, `synthesis.resolve_resolver`, and
  `synthesis.export_paper_artifact_bundle`.

### Requirement: Topic synthesis skills do not perform MCP environment discovery

Topic synthesis skills SHALL rely on the host ACP orchestration MCP checks and
SHALL NOT instruct agents to search MCP configuration or perform preflight
environment diagnosis before the runtime DB flow.

#### Scenario: Skill instructions delegate MCP checks to host

- **WHEN** create/update topic synthesis `SKILL.md` and runner prompts are read
- **THEN** they SHALL NOT instruct the agent to search `.claude` MCP config,
  test MCP tool injection, or confirm required tools before starting the gated
  runtime
- **AND** they SHALL retain the canceled branch for required tool failures
  during formal execution.
