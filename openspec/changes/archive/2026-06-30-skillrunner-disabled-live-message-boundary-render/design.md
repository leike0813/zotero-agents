## Overview

SkillRunner already receives complete chat replay events over foreground SSE.
The change keeps that transport and only adjusts the UI publish reason selected
after canonical transcript append.

## Boundary Model

In disabled streaming render mode, SkillRunner treats these conversation entries
as transcript publish boundaries:

- `assistant_message`
- `assistant_final`
- `assistant_process` when its process type is not `tool_call` or
  `command_execution`

Tool and command process entries remain canonical transcript entries but do not
publish a visible transcript snapshot by themselves. They appear with the next
message/thinking boundary or critical state.

## Implementation Notes

- Add a small SkillRunner helper in `skillRunnerRunDialog.ts` to classify
  disabled-live publish boundaries from `SkillRunnerConversationEntry`.
- Keep `scheduleSnapshotFlush()` disabled-live gating for generic live reasons.
- In `handleSseFrame()`, after appending the canonical entry, publish
  `assistant_message`, `assistant_final`, and non-tool/command
  `assistant_process` as `boundary` when streaming render is disabled.
- Do not subscribe to streaming preference inside the observer, abort SSE, or
  add polling.

## Failure Modes

Critical, waiting, terminal, error, cancel, and permission paths keep using
their existing immediate publish behavior. If an entry cannot be converted to a
conversation entry, no transcript publish decision changes.
