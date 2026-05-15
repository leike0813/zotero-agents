## ADDED Requirements

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
