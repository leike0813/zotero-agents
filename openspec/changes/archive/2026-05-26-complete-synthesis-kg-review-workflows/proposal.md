## Why

Topic Graph and Concept KB currently expose review-facing UI surfaces, but their canonical write path is incomplete. Suggested topic relations cannot be accepted or rejected from the Topic Inspector, and ambiguous or low-confidence concept proposals only become diagnostics instead of actionable review items.

## What Changes

- Add a Topic Graph relation review flow that promotes suggested edges to `confirmed` or `rejected` through canonical transactions.
- Add a Concept KB review queue for low-confidence and ambiguous concept card proposals, with actions to approve as new, merge into an existing concept, or reject.
- Wire Workbench host commands and snapshot DTOs so Topic Inspector and Concepts tab can complete these review loops.
- Keep review workflows internal to Synthesis service and Workbench; no external MCP/API surface, SQLite backend, or complex editor is added.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `synthesis-topic-graph`: Suggested edge review decisions become canonical state changes.
- `synthesis-concept-kb`: Ambiguous and low-confidence proposals become review queue items with canonical actions.
- `synthesis-workbench-ui`: Topic Inspector and Concepts tab expose actionable review controls backed by host commands.

## Impact

- Affects Synthesis KG services, service facades, Workbench UI model/rendering, and Workbench host command handling.
- Adds canonical concept review assets under `synthesis/concepts/review/*.json`.
- Reuses Foundation canonical transactions and projection stale marking; no new dependencies.
