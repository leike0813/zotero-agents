## MODIFIED Requirements

### Requirement: Synthesize-topic workflow has a real ACP Skill backend

The `synthesize-topic` workflow SHALL declare a builtin ACP Skill backend that
can produce a validated `topic_synthesis` result bundle.
The ACP Skill final JSON SHALL reference the Markdown artifact by
`markdown_path`; it SHALL NOT embed the full Markdown body in the final JSON.
The workflow `applyResult` hook SHALL resolve `markdown_path`, inject the
Markdown text into the host-side persistence bundle, and delegate persistence to
the plugin-owned Synthesis service.

#### Scenario: Workflow request is compiled

- **WHEN** the workflow request is inspected
- **THEN** it SHALL declare `request.create.skill_id` as `synthesize-topic`.

#### Scenario: Builtin workflow package is loaded

- **WHEN** builtin workflow manifests are loaded from `workflows_builtin`
- **THEN** `synthesize-topic` SHALL be discovered from the `synthesis-layer`
  workflow package.

#### Scenario: Skill output is validated

- **WHEN** the builtin skill registry is scanned
- **THEN** a `synthesize-topic` skill SHALL be registered
- **AND** its runner metadata SHALL point to an output schema for the result
  bundle.

#### Scenario: Skill output references a Markdown artifact

- **WHEN** the ACP Skill produces its final JSON result
- **THEN** the JSON SHALL include `markdown_path`
- **AND** it SHALL NOT include a `markdown` field containing the full Markdown
  body.
- **AND** `applyResult` SHALL read the referenced Markdown file before calling
  `applyTopicSynthesisResult`.

#### Scenario: Create mode checks topic duplicates semantically

- **WHEN** a `synthesize-topic` ACP Skill run starts with `mode=create`
- **THEN** it SHALL call `synthesis.list_topics` before resolver generation
- **AND** it SHALL compare the user seed only against existing topic
  `title/description/aliases`.

#### Scenario: Duplicate candidate requires confirmation

- **WHEN** a create-mode run finds a plausible existing topic duplicate
- **THEN** the agent SHALL ask for ACP interactive user confirmation before
  switching to update
- **AND** it SHALL call `synthesis.get_topic_context` only after the user chooses
  an existing topic to update.
