# Refine Synthesis Topic Inventory Governance

## Summary

Split create-mode topic de-duplication from freshness governance. Add a small
`synthesis.list_topics` inventory tool for semantic duplicate checks, while
keeping detailed update context behind `synthesis.get_topic_context`.

## Motivation

`synthesis.list_topics` is called early by the `synthesize-topic` ACP Skill when
the user supplies only a free topic seed. At that stage the agent only needs
semantic topic definitions. Returning resolvers, resolved paper sets, hashes,
registry rows, graph state, or Markdown excerpts increases prompt size and
encourages the agent to make freshness decisions that should stay deterministic
and plugin-owned.

## Scope

- Add `synthesis.list_topics` as a read-only MCP tool.
- Return only topic semantic fields: `topic_id`, `title`, `description`,
  `aliases`, `updated_at`, and optional status.
- Require create-mode `synthesize-topic` runs to call `synthesis.list_topics`
  before resolver generation.
- Require duplicate candidates to be confirmed through ACP interactive before
  switching to update.
- Keep detailed update context in `synthesis.get_topic_context`.
- Defer freshness implementation to separate deterministic governance work.

## Out of Scope

- Automatic topic freshness refresh.
- Automatic topic merge.
- Plugin-side semantic duplicate scoring.
- Changes to citation graph or paper registry projections.
