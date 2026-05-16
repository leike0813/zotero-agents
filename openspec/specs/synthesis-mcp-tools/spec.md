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

### Requirement: Topic inventory is semantic and bounded

The embedded Zotero MCP protocol SHALL expose `synthesis.list_topics` for
create-mode Synthesis topic duplicate checks.

#### Scenario: Topic inventory is listed

- **WHEN** an MCP client calls `tools/list`
- **THEN** `synthesis.list_topics` SHALL be present
- **AND** it SHALL use an empty JSON object input schema.

#### Scenario: Topic inventory is called

- **WHEN** an MCP client calls `synthesis.list_topics`
- **THEN** the MCP layer SHALL route to the Synthesis service
- **AND** it SHALL return topic rows with `topic_id`, `title`, `description`,
  `aliases`, and `updated_at`.

#### Scenario: Topic inventory remains small

- **WHEN** `synthesis.list_topics` returns existing topics
- **THEN** it SHALL NOT return resolver details, resolved paper sets, paper
  references, registry rows, artifact hashes, graph hashes, or Markdown
  excerpts.

### Requirement: Detailed topic context is update-only

Detailed Synthesis topic context SHALL remain separate from create-mode
duplicate checks.

#### Scenario: Existing topic is selected for update

- **WHEN** an ACP Skill agent needs resolver, base hash, old artifact, or
  resolved paper set details for an existing topic
- **THEN** it SHALL call `synthesis.get_topic_context` with the selected
  `topicId`.

### Requirement: Synthesis topic tools separate duplicate inventory from update context

Synthesis MCP topic inventory SHALL remain small, while detailed topic context
SHALL expose deterministic freshness for update workflows.

#### Scenario: Topic context contains freshness

- **WHEN** `synthesis.get_topic_context` is called for an active topic
- **THEN** the returned context SHALL include the current freshness state and
  reasons.

#### Scenario: Topic inventory excludes freshness

- **WHEN** `synthesis.list_topics` is called
- **THEN** the returned topic entries SHALL NOT include freshness, resolver,
  resolved paper set, artifact hashes, or markdown excerpts.
