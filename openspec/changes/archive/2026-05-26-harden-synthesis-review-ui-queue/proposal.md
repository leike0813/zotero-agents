## Why

Synthesis Workbench review surfaces are currently split across persistent lists,
inline detail boxes, and tag import controls. Empty review queues still occupy
space, active review items often show only a title or id, and users must scan
multiple rows before deciding what to do.

## What Changes

- Introduce a shared Workbench review card pattern for domain-local review
  queues.
- Show at most one actionable review message per domain at a time.
- Hide review panels when no review item is available.
- Move tag import into an explicit import popover instead of showing it by
  default.
- Keep all existing Synthesis service commands and canonical schemas.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `synthesis-workbench-ui`: Review queues use single-item detailed review cards
  with non-blocking animation and existing async action feedback.

## Impact

- Affects Synthesis Workbench rendering and styling only.
- Does not add MCP write tools, change canonical review item schemas, or alter
  background job behavior.
