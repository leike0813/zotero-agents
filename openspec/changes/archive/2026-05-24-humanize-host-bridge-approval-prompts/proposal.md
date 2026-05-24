## Why

Host Bridge approval prompts are currently built from machine request payloads,
so Zotero users see JSON-like workflow and mutation details when they need to
make a quick trust decision. Approval UI should explain the human action and
risk plainly while keeping technical payloads out of the primary prompt.

## What Changes

- Add a Host Bridge approval prompt contract for human-readable permission
  titles, summaries, and details.
- Replace raw JSON approval details for workflow submission with concise
  workflow/input descriptions.
- Replace raw JSON approval details for capability calls with concise
  capability or mutation descriptions.
- Rename the dashboard permission detail affordance from "View full request" to
  "View details".
- Keep approval routing and decision behavior unchanged.

## Capabilities

### New Capabilities

- `host-bridge-approval-prompts`: Host Bridge approval requests present
  user-facing action summaries instead of machine payload dumps.

### Modified Capabilities

- None.

## Impact

- Code:
  - Host Bridge workflow control permission request construction.
  - Host Bridge capability permission request construction.
  - Dashboard permission label text.
- APIs:
  - No transport or response schema changes.
  - Permission request `title`, `summary`, and `detail` text becomes
    user-facing and no longer includes raw JSON by default.
- Tests:
  - Workflow approval request copy.
  - Capability mutation approval request copy.
  - Dashboard permission label smoke coverage.
