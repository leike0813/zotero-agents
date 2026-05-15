## 1. MCP and Service Contract

- [x] Add `synthesis.list_topics` to the embedded MCP tool registry.
- [x] Route `synthesis.list_topics` through the Synthesis service boundary.
- [x] Implement semantic-only topic inventory DTOs.
- [x] Keep detailed topic update context in `synthesis.get_topic_context`.

## 2. Skill Contract

- [x] Require `synthesize-topic` create mode to call `synthesis.list_topics`.
- [x] Limit duplicate checks to `title/description/aliases`.
- [x] Require ACP interactive confirmation before switching suspected duplicates
  to update.
- [x] Allow `topic_definition.aliases` in the output schema.

## 3. Verification

- [x] Add service and MCP tests for semantic-only topic inventory.
- [x] Add skill package tests for create-mode duplicate flow.
- [x] Run targeted synthesis tests.
- [x] Run builtin workflow manifest check.
- [x] Run TypeScript typecheck.
- [x] Validate this OpenSpec change.
