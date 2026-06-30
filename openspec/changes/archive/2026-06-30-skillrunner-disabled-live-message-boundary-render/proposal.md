## Why

SkillRunner emits complete assistant/process conversation events rather than
ACP-style text chunks. Treating those complete events as generic live text while
streaming render is disabled hides useful run progress until an unrelated
boundary arrives.

## What Changes

- Keep SkillRunner foreground SSE observation in both streaming-render states.
- Keep canonical SkillRunner transcript accumulation real-time.
- When streaming render is disabled, publish visible transcript snapshots only
  when a complete assistant message, final assistant message, or thinking
  process event arrives.
- Keep tool/command process updates hidden until the next assistant message,
  thinking boundary, or critical state.

## Capabilities

### Modified Capabilities

- `assistant-workspace-ui-refresh-governance`: Clarifies that disabled streaming
  remains boundary-only while panel-specific complete-message boundaries may
  publish accumulated transcript state.
- `skillrunner-sidebar-host-runtime`: Defines SkillRunner message/process
  events that count as disabled-live transcript publish boundaries.

## Impact

- Affects SkillRunner Assistant Workspace transcript publish decisions.
- Does not change SkillRunner backend protocol, foreground SSE use, observer
  eligibility, ACP panels, persistence schema, or workflow result semantics.
