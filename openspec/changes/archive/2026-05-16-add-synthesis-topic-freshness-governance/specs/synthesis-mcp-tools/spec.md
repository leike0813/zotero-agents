## ADDED Requirements

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
