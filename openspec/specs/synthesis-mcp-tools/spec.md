# synthesis-mcp-tools Specification

## Purpose
TBD - created by archiving change add-synthesis-mcp-tools. Update Purpose after archive.
## Requirements
### Requirement: Synthesis job-time tools are exposed through embedded MCP

The embedded Zotero MCP protocol SHALL expose read-only Synthesis job-time tools
for ACP Skills agents.

#### Scenario: Tools are listed

- **WHEN** an MCP client calls `tools/list`
- **THEN** Synthesis job-time tools SHALL appear with names beginning
  `synthesis.`
- **AND** they SHALL use JSON object input schemas.

### Requirement: Synthesis MCP uses a DTO service boundary

Synthesis MCP tools SHALL call an injectable service boundary and SHALL NOT
expose raw Zotero objects.

#### Scenario: Tool is called

- **WHEN** a Synthesis MCP tool is called
- **THEN** the protocol handler SHALL route the validated args to the matching
  Synthesis service method
- **AND** return structured DTO content.

### Requirement: Synthesis MCP tools are read-only

Synthesis MCP tools SHALL expose read-only host capabilities for synthesis and
review workflow jobs.

#### Scenario: Job-time synthesis tool surface is bounded

- **WHEN** an MCP client lists Synthesis tools
- **THEN** `synthesis.list_topics`, `synthesis.get_topic_context`,
  `synthesis.get_library_index`, `synthesis.resolve_resolver`,
  `synthesis.get_paper_registry`, `synthesis.get_citation_graph_slice`, and
  `synthesis.get_review_input` SHALL be present
- **AND** `synthesis.get_paper_artifact_manifest` and
  `synthesis.read_paper_artifacts` SHALL NOT be present.

#### Scenario: Paper artifact payloads are read through Zotero note tools

- **WHEN** an ACP Skill agent needs digest, references, or citation-analysis
  artifact contents for resolved papers
- **THEN** it SHALL use generic Zotero note payload tools such as
  `get_item_notes`, `list_note_payloads`, and `get_note_payload`
- **AND** Synthesis MCP SHALL NOT duplicate those payload readers as public
  paper artifact read tools.

#### Scenario: Review input tool is listed

- **WHEN** an MCP client lists tools
- **THEN** `synthesis.get_review_input` SHALL be present
- **AND** no formal write tool SHALL be added.

#### Scenario: Review input tool is called

- **WHEN** an MCP client calls `synthesis.get_review_input`
- **THEN** the MCP layer SHALL route to the injected Synthesis service
- **AND** it SHALL return structured content without writing assets.

### Requirement: Synthesis MCP inputs are strict

Synthesis MCP inputs SHALL reject unknown top-level fields.

#### Scenario: Unknown arg is supplied

- **WHEN** a Synthesis tool call contains an unknown top-level argument
- **THEN** the MCP handler SHALL reject the call with an invalid parameter error.
