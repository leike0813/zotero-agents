## Why

ACP Chat restores conversations without persisted message-count metadata as
`unavailable`. Starting a later prompt does not change that state, so its
counter displays only the current value while the other Assistant panels use
the common `current/cumulative` format.

## What Changes

- Initialize empty ACP Chat conversations with an available zero-valued message
  counter.
- Start a new observed cumulative-count epoch when a legacy ACP Chat
  conversation next receives a user prompt, then persist and restore that
  epoch as normal `x/y` counter data.
- Preserve current-only display for a legacy conversation until that first new
  prompt; do not reconstruct hidden historical activity from transcript pages.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `acp-chat-file-backed-transcript-state`: define ACP Chat count initialization
  and legacy promotion semantics.
- `assistant-sidebar-ui`: define when the shared counter renders ACP Chat
  values in `x/y` form.

## Impact

- Shared Assistant message-count state and ACP Chat session hydration/prompt
  flow.
- ACP Chat persistence and focused ACP/UI regression tests.
